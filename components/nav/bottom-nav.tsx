"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation basse à 3 onglets (Accueil / Emploi du temps / Progression).
// Coquille vide fonctionnelle pour Story 1.1 -- pas de logique métier ici,
// juste des routes qui rendent un placeholder. Réglages est volontairement
// absent de cette barre (accessible ailleurs, cf. app/reglages).
const TABS = [
  { href: "/", label: "Accueil", fullLabel: "Accueil", icon: Home },
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
      className="sticky bottom-0 z-10 border-t border-border bg-card"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map(({ href, label, fullLabel, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={fullLabel}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // Zone de tap >= 44px (plancher d'accessibilité, cf. spec 1.1)
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon aria-hidden="true" className="size-6" />
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
