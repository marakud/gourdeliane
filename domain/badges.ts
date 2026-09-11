// CartableFlow -- domain/badges.ts (refonte visuelle, étape 8, FR-14)
//
// Pas de table `Badge` en base (décision actée, spec-refonte-visuelle.md --
// sans migration Prisma tant que l'utilisateur ne la demande pas
// explicitement) : le statut débloqué/verrouillé est dérivé du meilleur
// streak déjà calculé (domain/streak.ts), jamais une donnée persistée ou
// inventée. Paliers repris du mockup UX
// (ux-college-6eme-2026-09-02/mockups/key-screens.html, `.badge-grid`) --
// le PRD (FR-14) les laisse volontairement non tranchés ("à ajuster après
// usage réel") : ceux-ci sont un point de départ raisonnable, pas une
// décision produit figée.

export interface BadgeDefinition {
  threshold: number;
  label: string;
}

export const BADGE_THRESHOLDS: readonly BadgeDefinition[] = [
  { threshold: 3, label: "3 jours" },
  { threshold: 7, label: "7 jours" },
  { threshold: 14, label: "14 jours" },
  { threshold: 30, label: "30 jours" },
  { threshold: 60, label: "60 jours" },
  { threshold: 100, label: "100 jours" },
];

export interface BadgeView extends BadgeDefinition {
  unlocked: boolean;
}

/** `bestStreak` : le record personnel (domain/streak.ts::StreakResult.best),
 * jamais le streak courant -- un badge débloqué le reste même si le streak
 * en cours est retombé à zéro (EXPERIENCE.md : jamais retirer une
 * récompense déjà obtenue). */
export function computeBadges(bestStreak: number): BadgeView[] {
  return BADGE_THRESHOLDS.map((badge) => ({
    ...badge,
    unlocked: bestStreak >= badge.threshold,
  }));
}
