import { connection } from "next/server";
import { ensureSeedUser } from "@/data/user";
import { getScheduleForUser } from "@/data/schedule";
import {
  listChecklistItemStates,
  listSubjectItemsForSubjects,
} from "@/data/checklist";
import { dedupeSubjectsFromSlots, deriveDaySlots, type Weekday } from "@/domain/schedule";
import {
  getTomorrowSchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
} from "@/domain/school-day";
import {
  CHECKLIST_TYPE_SAC,
  deriveSacChecklist,
  type ChecklistSubjectGroupInput,
} from "@/domain/checklist";
import { SacChecklist } from "@/components/checklist/sac-checklist";

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
    </div>
  );
}
