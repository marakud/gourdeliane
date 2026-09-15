import { connection } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { getScheduleForUser } from "@/data/schedule";
import { listDevoirs } from "@/data/homework";
import { listHomeworkTimeSessions } from "@/data/homework-timer";
import { deleteDevoirAction, toggleDevoirDoneAction } from "@/actions/homework";
import { startHomeworkTimerAction, stopHomeworkTimerAction } from "@/actions/homework-timer";
import { toDevoirTaskView, type DevoirStatus } from "@/domain/homework";
import { summarizeHomeworkTimeSessions, type TimerMode } from "@/domain/homework-timer";
import { getTodaySchoolDate, schoolDateToIso } from "@/domain/school-day";
import type { Weekday } from "@/domain/schedule";
import { MesTachesView } from "@/components/homework/mes-taches-view";
import { ActiveSessionCard } from "@/components/homework/active-session-card";
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
  const timeSessions = await listHomeworkTimeSessions(userId);
  const { activeSessionByDevoirId, totalEndedSecondsByDevoirId } =
    summarizeHomeworkTimeSessions(
      timeSessions.map((session) => ({
        devoirId: session.devoirId,
        mode: session.mode as TimerMode,
        plannedSeconds: session.plannedSeconds,
        startedAtIso: session.startedAt.toISOString(),
        endedAtIso: session.endedAt ? session.endedAt.toISOString() : null,
      }))
    );

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
        planDateIso: devoir.planDate
          ? devoir.planDate.toISOString().slice(0, 10)
          : null,
        planTime: devoir.planTime,
        subject: {
          id: devoir.subject.id,
          name: devoir.subject.name,
          colorIndex: devoir.subject.colorIndex,
        },
        activeSession: activeSessionByDevoirId.get(devoir.id) ?? null,
        totalRealSeconds: totalEndedSecondsByDevoirId.get(devoir.id) ?? 0,
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

  // Minuteur de devoirs -- même carte "Devoir en cours" que l'Accueil
  // (retour utilisateur : invisible ici auparavant, alors que "Mes tâches"
  // est l'écran où un devoir est le plus souvent démarré). Dérivée de
  // `devoirsView` déjà enrichi, jamais un second calcul divergent (AD-5).
  const activeSessionEntries = devoirsView
    .filter((devoir) => devoir.activeSession !== null)
    .map((devoir) => ({
      devoirId: devoir.id,
      description: devoir.description,
      subject: { name: devoir.subject.name, colorIndex: devoir.subject.colorIndex },
      session: devoir.activeSession!,
    }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Mes tâches
        </h1>
        <p className="text-base text-muted-foreground">
          Tous tes devoirs, organisés par date.
        </p>
      </div>

      <ActiveSessionCard
        entries={activeSessionEntries}
        onMarkDone={toggleDevoirDoneAction}
        onStop={stopHomeworkTimerAction}
      />

      <MesTachesView
        devoirs={devoirsView}
        todayIso={todayIso}
        subjects={homeworkSubjects}
        scheduleSlots={slots}
        onToggle={toggleDevoirDoneAction}
        onStartTimer={startHomeworkTimerAction}
        onStopTimer={stopHomeworkTimerAction}
        onDelete={deleteDevoirAction}
      />

      <AddHomeworkFab subjects={homeworkSubjects} scheduleSlots={slots} />
    </div>
  );
}
