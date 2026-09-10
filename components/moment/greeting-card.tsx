import { Backpack } from "lucide-react";
import type { DayMoment } from "@/domain/school-day";
import { MOMENT_GREETING, MOMENT_LABELS } from "@/domain/school-day";
import type { MomentProgress } from "@/domain/day-completion";

// Refonte visuelle -- grande carte personnalisée en tête de l'Accueil,
// remplace l'ancien bloc `<h1>Bonjour...</h1>` + paragraphe date/heure.
// Purement présentationnel (aucune donnée n'est recalculée ici -- `progress`
// et `currentMoment` arrivent déjà calculés côté serveur, AD-1/AD-5) : pas de
// `"use client"`, aucune interactivité. Contrairement à `MOMENT_LABELS`
// (Story 3.2), aucun risque de frontière "use client" ici puisque ce
// composant lui-même n'en a pas besoin.

const GRADIENT_BY_MOMENT: Record<DayMoment, string> = {
  MATIN: "var(--gradient-matin)",
  RETOUR: "var(--gradient-retour)",
  SOIR: "var(--gradient-soir)",
};

export interface GreetingCardProps {
  firstName: string | null;
  dateLabel: string;
  timeLabel: string;
  currentMoment: DayMoment;
  progress: MomentProgress;
}

/** Texte "missions restantes" (jamais "0/0" cru) -- ton neutre/positif,
 * jamais culpabilisant (DESIGN.md). */
function formatMissionsLabel(progress: MomentProgress): string {
  if (progress.total === 0) return "Rien de prévu pour l'instant.";
  const remaining = progress.total - progress.done;
  if (remaining === 0) return "Tout est prêt !";
  return `${remaining} mission${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`;
}

export function GreetingCard({
  firstName,
  dateLabel,
  timeLabel,
  currentMoment,
  progress,
}: GreetingCardProps) {
  const percent =
    progress.total === 0 ? 100 : Math.round((progress.done / progress.total) * 100);

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-brand ring-1 ring-border"
      style={{ backgroundImage: GRADIENT_BY_MOMENT[currentMoment] }}
    >
      <Backpack
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -bottom-4 h-28 w-28 text-primary/10"
        strokeWidth={1.5}
      />

      <div className="relative flex flex-col gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {firstName ? `Bonjour ${firstName} !` : "Bonjour !"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dateLabel}, il est {timeLabel}.
          </p>
        </div>

        <p className="text-base text-foreground">{MOMENT_GREETING[currentMoment]}</p>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm font-medium text-foreground">
            <span>{formatMissionsLabel(progress)}</span>
            {progress.total > 0 && (
              <span className="text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            aria-label={`Progression -- ${MOMENT_LABELS[currentMoment]}`}
            className="h-2 rounded-full bg-foreground/10"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
