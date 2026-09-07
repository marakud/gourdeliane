import { connection } from "next/server";
import { ensureSeedUser } from "@/data/user";
import { getScheduleForUser } from "@/data/schedule";
import {
  listChecklistItemStates,
  listFixedChecklistItems,
  listSubjectItemsForSubjects,
} from "@/data/checklist";
import { dedupeSubjectsFromSlots, deriveDaySlots, type Weekday } from "@/domain/schedule";
import {
  getTodaySchoolDate,
  getTomorrowSchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
} from "@/domain/school-day";
import {
  CHECKLIST_TYPE_MATIN,
  CHECKLIST_TYPE_RETOUR,
  CHECKLIST_TYPE_SAC,
  DEFAULT_MATIN_ITEMS,
  DEFAULT_RETOUR_ITEMS,
  deriveFixedChecklist,
  deriveSacChecklist,
  type ChecklistSubjectGroupInput,
} from "@/domain/checklist";
import {
  toggleMatinChecklistItem,
  toggleRetourChecklistItem,
} from "@/actions/checklist";
import { SacChecklist } from "@/components/checklist/sac-checklist";
import { FixedChecklist } from "@/components/checklist/fixed-checklist";

export default async function AccueilPage() {
  // Force le rendu dynamique à chaque requête (AGENTS.md -- modèle de cache
  // "component-level" de cette version de Next.js) : "demain" (AD-4) et la
  // requête Prisma ne sont pas des Request-time APIs qui déclencheraient ça
  // d'elles-mêmes, cf. app/edt/page.tsx (Story 1.3).
  await connection();

  const user = await ensureSeedUser();
  const { subjects, scheduleSlots, noSchoolDays } = await getScheduleForUser(
    user.id
  );

  const slots = scheduleSlots.map((slot) => ({
    id: slot.id,
    weekday: slot.weekday as Weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    subject: { name: slot.subject.name, colorIndex: slot.subject.colorIndex },
  }));

  const noSchoolDayIsoSet = new Set(
    noSchoolDays.map((day) => day.date.toISOString().slice(0, 10))
  );

  // "Demain" : calcul serveur en Europe/Paris fixe (AD-4), réutilisé tel
  // quel depuis domain/school-day.ts (Story 1.3) -- jamais recalculé
  // différemment ici (Boundaries de la spec 2.1).
  const now = new Date();
  const tomorrowDate = getTomorrowSchoolDate(now);
  const tomorrowIso = schoolDateToIso(tomorrowDate);
  const tomorrowWeekday = schoolDateToWeekday(tomorrowDate);

  const tomorrowSlots = deriveDaySlots(
    slots,
    tomorrowWeekday,
    tomorrowIso,
    noSchoolDayIsoSet
  );

  // Matières ayant cours demain, dédupliquées (une matière peut avoir
  // plusieurs créneaux le même jour) en gardant l'ordre du premier créneau
  // de la journée -- puis résolues vers l'enregistrement `Subject` complet
  // (id inclus) pour pouvoir charger ses `SubjectItem` (domain/schedule.ts,
  // testé indépendamment de cette page).
  const tomorrowSubjects = dedupeSubjectsFromSlots(tomorrowSlots, subjects);

  let sacGroups: ReturnType<typeof deriveSacChecklist> = [];
  if (tomorrowSubjects.length > 0) {
    const subjectIds = tomorrowSubjects.map((subject) => subject.id);
    const tomorrowDateAsDate = new Date(`${tomorrowIso}T00:00:00.000Z`);

    const [subjectItems, checkedStates] = await Promise.all([
      listSubjectItemsForSubjects(user.id, subjectIds),
      listChecklistItemStates(user.id, tomorrowDateAsDate, CHECKLIST_TYPE_SAC),
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
        items: itemsBySubjectId.get(subject.id) ?? [],
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

  // "Ce matin" (Story 2.2) : porte sur AUJOURD'HUI, pas demain (Boundaries
  // spec 2.2) -- indépendant de l'EDT, toujours affiché. Le pré-remplissage
  // des défauts à la première consultation est géré par
  // data/checklist.ts::listFixedChecklistItems.
  const todayDate = getTodaySchoolDate(now);
  const todayIso = schoolDateToIso(todayDate);
  const todayDateAsDate = new Date(`${todayIso}T00:00:00.000Z`);

  // "Retour" (Story 2.3) : même mécanisme exact que "Ce matin" ci-dessus --
  // porte sur AUJOURD'HUI (AD-4), indépendant de l'EDT, toujours affiché.
  // Types distincts (`CHECKLIST_TYPE_RETOUR` vs `CHECKLIST_TYPE_MATIN`) :
  // cocher un item de l'un n'affecte jamais l'état de l'autre (I/O matrix
  // spec 2.3). Les 4 requêtes Matin+Retour sont batchées dans un seul
  // Promise.all (indépendantes entre elles) plutôt que deux Promise.all
  // séquentiels, pour ne pas payer un aller-retour DB supplémentaire.
  const [matinItems, matinCheckedStates, retourItems, retourCheckedStates] =
    await Promise.all([
      listFixedChecklistItems(user.id, CHECKLIST_TYPE_MATIN, DEFAULT_MATIN_ITEMS),
      listChecklistItemStates(user.id, todayDateAsDate, CHECKLIST_TYPE_MATIN),
      listFixedChecklistItems(user.id, CHECKLIST_TYPE_RETOUR, DEFAULT_RETOUR_ITEMS),
      listChecklistItemStates(user.id, todayDateAsDate, CHECKLIST_TYPE_RETOUR),
    ]);

  const matinChecklist = deriveFixedChecklist(
    matinItems.map((item) => ({ id: item.id, label: item.label })),
    matinCheckedStates.map((state) => ({
      sourceType: state.sourceType,
      sourceId: state.sourceId,
      checked: state.checked,
    }))
  );

  const retourChecklist = deriveFixedChecklist(
    retourItems.map((item) => ({ id: item.id, label: item.label })),
    retourCheckedStates.map((state) => ({
      sourceType: state.sourceType,
      sourceId: state.sourceId,
      checked: state.checked,
    }))
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Accueil
        </h1>
        <p className="text-base text-muted-foreground">
          Ce qu&apos;il te faut pour demain, préparé pour toi.
        </p>
      </div>

      {sacGroups.length > 0 ? (
        <SacChecklist groups={sacGroups} dateIso={tomorrowIso} />
      ) : (
        <p className="rounded-2xl bg-card px-4 py-8 text-center text-base text-muted-foreground ring-1 ring-border">
          Pas cours demain, profite de ta soirée !
        </p>
      )}

      <FixedChecklist
        title="Ce matin"
        items={matinChecklist}
        dateIso={todayIso}
        headingId="matin-heading"
        onToggle={toggleMatinChecklistItem}
      />

      <FixedChecklist
        title="Retour"
        items={retourChecklist}
        dateIso={todayIso}
        headingId="retour-heading"
        onToggle={toggleRetourChecklistItem}
      />
    </div>
  );
}
