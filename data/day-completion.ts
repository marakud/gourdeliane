import { prisma } from "./prisma";
import { getScheduleForUser, toUtcMidnight } from "./schedule";
import { listChecklistItemStates, listSubjectItemsForSubjects } from "./checklist";
import { listDevoirs } from "./homework";
import {
  computeWeekParity,
  dedupeSubjectsFromSlots,
  deriveDaySlots,
  type Weekday,
  type WeekParity,
} from "@/domain/schedule";
import {
  getTodaySchoolDate,
  getTomorrowSchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
} from "@/domain/school-day";
import {
  CHECKLIST_TYPE_REVISIONS,
  CHECKLIST_TYPE_SAC,
  deriveRevisionsChecklist,
  deriveSacChecklist,
  partitionDevoirsARendreForSac,
  type ChecklistSubjectGroupInput,
} from "@/domain/checklist";
import {
  computeSoirCompletion,
  DAY_COMPLETION_MOMENT_SOIR,
} from "@/domain/day-completion";

// Story 2.7 -- persistance de la complétude par jour/moment (AD-5). Toute
// écriture passe par `upsertDayCompletion` (clé stable `(userId, date,
// moment)`, même convention que `ChecklistItemState`). `recomputeAndPersistSoirCompletion`
// est l'unique point d'entrée qui recalcule "SOIR" depuis l'état réel en base
// -- appelé après chaque coche pertinente (actions/checklist.ts,
// actions/homework.ts), jamais depuis l'UI directement.

/** Upsert brut, sans recalcul -- utilisé par `recomputeAndPersistSoirCompletion`
 * ci-dessous ; pas d'autre appelant prévu (le calcul lui-même vit toujours
 * dans domain/day-completion.ts, jamais dupliqué côté appelant). `moment`
 * n'accepte que la seule valeur effectivement calculée par cette story --
 * "MATIN"/"RETOUR" restent des valeurs réservées côté schéma (commentaire
 * Prisma) mais jamais écrites ici (Never de la spec 2.7) ; le type reflète
 * cette restriction plutôt qu'un `string` ouvert. */
export async function upsertDayCompletion(
  userId: string,
  date: Date,
  moment: typeof DAY_COMPLETION_MOMENT_SOIR,
  complete: boolean
) {
  const normalizedDate = toUtcMidnight(date);
  return prisma.dayCompletion.upsert({
    where: { userId_date_moment: { userId, date: normalizedDate, moment } },
    create: { userId, date: normalizedDate, moment, complete },
    update: { complete },
  });
}

/**
 * Recalcule la complétude du moment "Ce soir" (Story 2.7, FR-20) depuis
 * l'état réel en base -- reconstitue les mêmes données que
 * app/(accueil)/page.tsx (EDT demain/aujourd'hui, Sac, Révisions, devoirs "à
 * rendre" échéant demain) via les fonctions data/domain déjà existantes et
 * testées, puis appelle `computeSoirCompletion` (domain/day-completion.ts) --
 * jamais un second calcul divergent (AD-5). Persiste le résultat dans
 * `DayCompletion` (moment=SOIR, date=aujourd'hui). La détection de la
 * transition "vient juste d'être complétée" pour la célébration vit côté
 * page (`app/(accueil)/page.tsx` recalcule `complete` depuis les données déjà
 * chargées à chaque rendu -- rafraîchi par le `revalidatePath` déjà appelé
 * par chaque action -- et `MomentSoirCard` compare l'ancienne/nouvelle valeur
 * via une ref) : cette fonction n'a besoin de retourner que la valeur
 * persistée, pas un diff.
 */
export async function recomputeAndPersistSoirCompletion(
  userId: string,
  now: Date
): Promise<{ complete: boolean }> {
  // `userId` est déjà celui de l'appelant (résolu par `requireUserId()` côté
  // action, cf. lib/current-user.ts) -- relit sa propre ligne par cet id
  // plutôt que de repasser par la session (chaque famille a son propre
  // utilisateur depuis l'ajout de l'authentification multi-famille).
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const weekAReferenceMondayIso = user.weekAReferenceMonday
    ? user.weekAReferenceMonday.toISOString().slice(0, 10)
    : null;

  const { subjects, scheduleSlots, noSchoolDays } = await getScheduleForUser(
    userId
  );
  const slots = scheduleSlots.map((slot) => ({
    id: slot.id,
    weekday: slot.weekday as Weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    weekParity: slot.weekParity as WeekParity | null,
    subject: { name: slot.subject.name, colorIndex: slot.subject.colorIndex },
  }));
  const noSchoolDayIsoSet = new Set(
    noSchoolDays.map((day) => day.date.toISOString().slice(0, 10))
  );

  const tomorrowDate = getTomorrowSchoolDate(now);
  const tomorrowIso = schoolDateToIso(tomorrowDate);
  const tomorrowWeekday = schoolDateToWeekday(tomorrowDate);
  const tomorrowParity = weekAReferenceMondayIso
    ? computeWeekParity(tomorrowIso, weekAReferenceMondayIso)
    : null;
  const tomorrowSlots = deriveDaySlots(
    slots,
    tomorrowWeekday,
    tomorrowIso,
    noSchoolDayIsoSet,
    tomorrowParity
  );
  const tomorrowSubjects = dedupeSubjectsFromSlots(tomorrowSlots, subjects);

  const todayDate = getTodaySchoolDate(now);
  const todayIso = schoolDateToIso(todayDate);
  const todayWeekday = schoolDateToWeekday(todayDate);
  const todayParity = weekAReferenceMondayIso
    ? computeWeekParity(todayIso, weekAReferenceMondayIso)
    : null;
  const todaySlots = deriveDaySlots(
    slots,
    todayWeekday,
    todayIso,
    noSchoolDayIsoSet,
    todayParity
  );
  const todaySubjects = dedupeSubjectsFromSlots(todaySlots, subjects);

  const devoirs = await listDevoirs(userId);
  const { itemsBySubjectId: devoirARendreItemsBySubjectId } =
    partitionDevoirsARendreForSac(
      devoirs.map((devoir) => ({
        id: devoir.id,
        subjectId: devoir.subjectId,
        description: devoir.description,
        aRendre: devoir.aRendre,
        echeanceIso: devoir.echeance
          ? devoir.echeance.toISOString().slice(0, 10)
          : null,
      })),
      tomorrowIso,
      new Set(tomorrowSubjects.map((subject) => subject.id))
    );

  let sacGroups: ReturnType<typeof deriveSacChecklist> = [];
  if (tomorrowSubjects.length > 0) {
    const subjectIds = tomorrowSubjects.map((subject) => subject.id);
    const tomorrowDateAsDate = new Date(`${tomorrowIso}T00:00:00.000Z`);
    const [subjectItems, checkedStates] = await Promise.all([
      listSubjectItemsForSubjects(userId, subjectIds),
      listChecklistItemStates(userId, tomorrowDateAsDate, CHECKLIST_TYPE_SAC),
    ]);

    const itemsBySubjectId = new Map<string, { id: string; label: string }[]>();
    for (const item of subjectItems) {
      const list = itemsBySubjectId.get(item.subjectId) ?? [];
      list.push({ id: item.id, label: item.label });
      itemsBySubjectId.set(item.subjectId, list);
    }

    const checklistGroups: ChecklistSubjectGroupInput[] = tomorrowSubjects.map(
      (subject) => ({
        subject: {
          id: subject.id,
          name: subject.name,
          colorIndex: subject.colorIndex,
        },
        items: [
          ...(itemsBySubjectId.get(subject.id) ?? []),
          ...(devoirARendreItemsBySubjectId.get(subject.id) ?? []),
        ],
      })
    );

    sacGroups = deriveSacChecklist(
      checklistGroups,
      checkedStates.map((state) => ({
        sourceType: state.sourceType,
        sourceId: state.sourceId,
        checked: state.checked,
      }))
    );
  }

  let revisionsItems: ReturnType<typeof deriveRevisionsChecklist> = [];
  if (todaySubjects.length > 0) {
    const todayDateAsDate = new Date(`${todayIso}T00:00:00.000Z`);
    const revisionsCheckedStates = await listChecklistItemStates(
      userId,
      todayDateAsDate,
      CHECKLIST_TYPE_REVISIONS
    );
    revisionsItems = deriveRevisionsChecklist(
      todaySubjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        colorIndex: subject.colorIndex,
      })),
      revisionsCheckedStates.map((state) => ({
        sourceType: state.sourceType,
        sourceId: state.sourceId,
        checked: state.checked,
      }))
    );
  }

  const devoirsARendreDemain = devoirs
    .filter(
      (devoir) =>
        devoir.aRendre &&
        devoir.echeance &&
        devoir.echeance.toISOString().slice(0, 10) === tomorrowIso
    )
    .map((devoir) => ({ done: devoir.done }));

  const complete = computeSoirCompletion({
    sacGroups,
    revisionsItems,
    devoirsARendreDemain,
  });

  const todayDateAsDate = new Date(`${todayIso}T00:00:00.000Z`);
  await upsertDayCompletion(
    userId,
    todayDateAsDate,
    DAY_COMPLETION_MOMENT_SOIR,
    complete
  );

  return { complete };
}
