"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, ListChecks, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation basse (Accueil / Mes tâches / Emploi du temps / Progression).
// Réglages est volontairement absent de cette barre (accessible ailleurs,
// cf. app/reglages). "Mes tâches" (évolution CartableFlow) juste après
// Accueil : hub central des devoirs, aussi central au quotidien que
// l'Accueil lui-même -- ListChecks plutôt qu'une nouvelle icône proche
// (CalendarDays est déjà pris par l'EDT, éviter toute ambiguïté visuelle).
const TABS = [
  { href: "/", label: "Accueil", fullLabel: "Accueil", icon: Home },
  {
    href: "/mes-taches",
    label: "Tâches",
    fullLabel: "Mes tâches",
    icon: ListChecks,
  },
  {
    href: "/edt",
    label: "EDT",
    fullLabel: "Emploi du temps",
    icon: CalendarDays,
  },
  {
    href: "/progression",
    label: "Progression",
    fullLabel: "Progression",
    icon: TrendingUp,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      // Refonte visuelle étape 5 -- padding-bottom additionnel = zone sûre
      // iPhone (encoche/barre d'accueil), cf. `viewport-fit=cover` posé sur
      // <html> dans app/layout.tsx (sans lui `env()` resterait figé à 0 même
      // sur iPhone). `max()` évite de perdre le padding existant sur les
      // appareils sans zone sûre (valeur env() alors égale à 0).
      className="sticky bottom-0 z-10 border-t border-border bg-card pb-[max(0px,env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map(({ href, label, fullLabel, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={fullLabel}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // Zone de tap >= 44px (plancher d'accessibilité, cf. spec 1.1)
                  // -- inchangée : le padding est sur la pastille interne
                  // (ci-dessous), pas sur cette zone de tap.
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Refonte visuelle étape 5 -- pastille/fond coloré derrière
                    l'icône active plutôt qu'un simple changement de couleur de
                    texte (demande explicite du plan), cf. mockup
                    ux-college-6eme-2026-09-02 `.nav-pill`. */}
                <span
                  className={cn(
                    "flex h-7 w-10 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-primary/10"
                  )}
                >
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                {/* text-base (16px) : plancher d'accessibilité de la spec 1.1 */}
                <span className="text-base leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
