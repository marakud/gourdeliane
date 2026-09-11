import { Flame } from "lucide-react";

// Refonte visuelle étape 8 -- reprend `.streak-hero` du mockup UX
// (ux-college-6eme-2026-09-02/mockups/key-screens.html) : gros nombre +
// icône flamme, label, record personnel en dessous. Purement présentationnel
// (le streak arrive déjà calculé côté serveur, data/streak.ts -- AD-1),
// affiché tel quel même à 0 (EXPERIENCE.md : jamais un échec, un simple
// constat neutre -- pas de message spécial pour ce cas).
export interface StreakHeroProps {
  current: number;
  best: number;
}

export function StreakHero({ current, best }: StreakHeroProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 text-center">
      <div className="flex items-center gap-2 font-heading text-6xl font-bold text-primary">
        <Flame
          aria-hidden="true"
          className="size-10 fill-accent text-accent"
        />
        {current}
      </div>
      <p className="text-sm font-semibold text-muted-foreground">
        jour{current > 1 ? "s" : ""} d&apos;affilée en ce moment
      </p>
      <p className="text-xs font-semibold text-neutral-pending">
        Record personnel : {best} jour{best > 1 ? "s" : ""}
      </p>
    </div>
  );
}
