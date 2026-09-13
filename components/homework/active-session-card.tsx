"use client";

import { useEffect, useState } from "react";
import { Square, Timer } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import type {
  ToggleDevoirDoneAction,
  StopTimerAction,
} from "@/components/homework/devoirs-list";
import {
  computeTimerProgress,
  formatClockDuration,
  TIMER_MODE_MINUTEUR,
  type ActiveHomeworkSession,
} from "@/domain/homework-timer";
import { cn } from "@/lib/utils";

// Carte "Devoir en cours" (évolution CartableFlow, retour utilisateur --
// bouton "Commencer" -> chronomètre/minuteur) : affichée sur l'Accueil tant
// qu'une session tourne, quel que soit l'onglet Matin/Retour/Soir actif (un
// devoir en cours reste pertinent toute la journée). Le temps affiché se
// recalcule à chaque seconde depuis `session.startedAtIso` (horodatage
// serveur réel) et l'horloge du navigateur -- jamais un compteur client
// perdu au rechargement (retour utilisateur : "résistant" implicite, même
// esprit que le reste de l'app qui ne recalcule jamais depuis un état
// perdable). Dépassement de minuteur (retour utilisateur -- décision
// explicite) : bascule visuelle "Temps écoulé", jamais de verrou ni d'arrêt
// automatique -- l'affichage continue simplement de défiler en dépassement.

export interface ActiveSessionEntry {
  devoirId: string;
  description: string;
  subject: { name: string; colorIndex: number };
  session: ActiveHomeworkSession;
}

export interface ActiveSessionCardProps {
  entries: ActiveSessionEntry[];
  onMarkDone: ToggleDevoirDoneAction;
  onStop: StopTimerAction;
}

function useNowTickingEverySecond(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function SingleActiveSession({
  entry,
  now,
  onMarkDone,
  onStop,
}: {
  entry: ActiveSessionEntry;
  now: number;
  onMarkDone: ToggleDevoirDoneAction;
  onStop: StopTimerAction;
}) {
  const [pending, setPending] = useState(false);
  const startedAtMs = new Date(entry.session.startedAtIso).getTime();
  const elapsedSeconds = Math.floor((now - startedAtMs) / 1000);
  const progress = computeTimerProgress(
    entry.session.mode,
    entry.session.plannedSeconds,
    elapsedSeconds
  );
  const isMinuteur = entry.session.mode === TIMER_MODE_MINUTEUR;

  function handleMarkDone() {
    setPending(true);
    onMarkDone({ id: entry.devoirId, done: true }).finally(() => setPending(false));
  }

  function handleStop() {
    setPending(true);
    onStop({ devoirId: entry.devoirId }).finally(() => setPending(false));
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center gap-3">
        <SubjectTag name={entry.subject.name} colorIndex={entry.subject.colorIndex} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-medium text-foreground">
            {entry.description}
          </span>
          <span className="text-sm text-muted-foreground">{entry.subject.name}</span>
        </div>
        <Timer aria-hidden="true" className="size-5 shrink-0 text-primary" />
      </div>

      <div
        className={cn(
          "flex flex-col items-center gap-1 rounded-xl py-3",
          progress.isOvertime ? "bg-destructive/10" : "bg-primary/10"
        )}
      >
        <span
          className={cn(
            "font-heading text-3xl font-bold tabular-nums",
            progress.isOvertime ? "text-destructive" : "text-primary"
          )}
        >
          {isMinuteur
            ? formatClockDuration(progress.remainingSeconds ?? 0)
            : formatClockDuration(progress.elapsedSeconds)}
        </span>
        <span className="text-sm text-muted-foreground">
          {isMinuteur
            ? progress.isOvertime
              ? `Temps écoulé -- dépassement de ${formatClockDuration(progress.overtimeSeconds)}`
              : "Temps restant"
            : "Temps écoulé"}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleStop}
          disabled={pending}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted px-3 text-base font-medium text-foreground disabled:opacity-60"
        >
          <Square aria-hidden="true" className="size-4" />
          Arrêter
        </button>
        <button
          type="button"
          onClick={handleMarkDone}
          disabled={pending}
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-primary px-3 text-base font-medium text-primary-foreground disabled:opacity-60"
        >
          Marquer terminé
        </button>
      </div>
    </div>
  );
}

export function ActiveSessionCard({ entries, onMarkDone, onStop }: ActiveSessionCardProps) {
  const now = useNowTickingEverySecond();

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <SingleActiveSession
          key={entry.devoirId}
          entry={entry}
          now={now}
          onMarkDone={onMarkDone}
          onStop={onStop}
        />
      ))}
    </div>
  );
}
