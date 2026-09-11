import { Star } from "lucide-react";
import type { BadgeView } from "@/domain/badges";
import { cn } from "@/lib/utils";

// Refonte visuelle étape 8 -- reprend `.badge-grid`/`.badge-tile` du mockup
// UX (ux-college-6eme-2026-09-02/mockups/key-screens.html). `badges` arrive
// déjà calculé (domain/badges.ts::computeBadges, à partir du vrai meilleur
// streak -- AD-1) : aucun statut débloqué/verrouillé inventé ici.
export interface BadgeGridProps {
  badges: readonly BadgeView[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-4">
      {badges.map((badge) => (
        <li
          key={badge.threshold}
          className="flex flex-col items-center gap-1.5"
          aria-label={`${badge.label} -- ${badge.unlocked ? "débloqué" : "verrouillé"}`}
        >
          <div
            aria-hidden="true"
            className={cn(
              "flex size-14 items-center justify-center rounded-full",
              badge.unlocked
                ? "bg-accent shadow-sm"
                : "border-2 border-dashed border-border"
            )}
          >
            <Star
              className={cn(
                "size-6",
                badge.unlocked
                  ? "fill-accent-foreground text-accent-foreground"
                  : "text-neutral-pending"
              )}
            />
          </div>
          <span
            aria-hidden="true"
            className={cn(
              "text-xs font-semibold text-center",
              badge.unlocked ? "text-muted-foreground" : "text-muted-foreground/60"
            )}
          >
            {badge.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
