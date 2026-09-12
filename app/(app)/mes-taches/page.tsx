import { connection } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { getScheduleForUser } from "@/data/schedule";
import { listDevoirs } from "@/data/homework";
import {
  deleteDevoirAction,
  startDevoirAction,
  toggleDevoirDoneAction,
} from "@/actions/homework";
import { toDevoirTaskView, type DevoirStatus } from "@/domain/homework";
import { getTodaySchoolDate, schoolDateToIso } from "@/domain/school-day";
import type { Weekday } from "@/domain/schedule";
import { MesTachesView } from "@/components/homework/mes-taches-view";
import { AddHomeworkFab } from "@/components/homework/add-homework-fab";

// Évolution CartableFlow -- page "Mes tâches" (étape 3 du plan) : regroupe
// tous les devoirs (Accueil n'en montre qu'un sous-ensemble, "Ce soir")
// derrière 6 vues (Aujourd'hui/Demain/Cette semaine/Plus tard/En
// retard/Terminés, domain/homework.ts::classifyTaskView) + filtres matière/
// statut. Réutilise `toDevoirTaskView` (même mapping que l'Accueil, AD-5)
// et les mêmes Server Actions (toggle/start/delete) -- aucune nouvelle
// règle métier, seulement un nouvel écran de lecture/filtrage.
export default async function MesTachesPage() {
  // Même garde que app/edt/page.tsx -- sans elle, Next.js pourrait figer
  // cette page au moment du build (aucune "Request-time API" ne la rend
  // dynamique d'elle-même, cf. AGENTS.md).
  await connection();

  const userId = await requireUserId();
  const { subjects, scheduleSlots } = await getScheduleForUser(userId);
  const devoirs = await listDevoirs(userId);

  const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));

  const devoirsView = devoirs.map((devoir) =>
    toDevoirTaskView(
      {
        id: devoir.id,
        description: devoir.description,
        done: devoir.done,
        aRendre: devoir.aRendre,
        status: devoir.status as DevoirStatus,
        estimatedMinutes: devoir.estimatedMinutes,
        echeanceIso: devoir.echeance
          ? devoir.echeance.toISOString().slice(0, 10)
          : null,
        plannedWeekday: devoir.plannedWeekday,
        plannedStartTime: devoir.plannedStartTime,
        subject: {
          id: devoir.subject.id,
          name: devoir.subject.name,
          colorIndex: devoir.subject.colorIndex,
        },
      },
      todayIso
    )
  );

  const homeworkSubjects = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    colorIndex: subject.colorIndex,
  }));

  const slots = scheduleSlots.map((slot) => ({
    weekday: slot.weekday as Weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Mes tâches
        </h1>
        <p className="text-base text-muted-foreground">
          Tous tes devoirs, organisés par échéance.
        </p>
      </div>

      <MesTachesView
        devoirs={devoirsView}
        subjects={homeworkSubjects}
        scheduleSlots={slots}
        onToggle={toggleDevoirDoneAction}
        onStart={startDevoirAction}
        onDelete={deleteDevoirAction}
      />

      <AddHomeworkFab subjects={homeworkSubjects} scheduleSlots={slots} />
    </div>
  );
}
