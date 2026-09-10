"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { MOMENT_LABELS, type DayMoment } from "@/domain/school-day";

// Retour utilisateur -- Accueil affichait "Ce soir"/"Ce matin"/"Retour"
// empilés et dépliés en permanence ("beaucoup d'information" pour un
// enfant). Ce composant bascule vers un seul moment affiché à la fois, même
// pattern (onglets accessibles au clavier, panneaux `hidden` toujours
// montés) que celui déjà utilisé pour Aujourd'hui/Demain/Semaine sur /edt
// (`components/schedule/edt-view-tabs.tsx`) -- pas une copie littérale
// (celui-ci indexe ses panneaux via `TABS`/`panels` plutôt que trois blocs
// écrits en dur, cf. correctif de revue). Les trois panneaux sont déjà
// construits par `app/(accueil)/page.tsx` (Server Component, aucune logique
// de données ici) et reçus tout faits.

export interface MomentTabsProps {
  initialActive: DayMoment;
  matin: ReactNode;
  retour: ReactNode;
  soir: ReactNode;
}

// Ordre d'affichage des onglets, explicite (correctif de revue) -- ne repose
// jamais sur l'ordre d'insertion des clés de `MOMENT_LABELS`, qui pourrait
// changer silencieusement sans réordonner intentionnellement les onglets.
const MOMENT_ORDER: DayMoment[] = ["MATIN", "RETOUR", "SOIR"];

const TABS: { id: DayMoment; label: string }[] = MOMENT_ORDER.map((id) => ({
  id,
  label: MOMENT_LABELS[id],
}));

export function MomentTabs({ initialActive, matin, retour, soir }: MomentTabsProps) {
  const [active, setActive] = useState<DayMoment>(initialActive);
  // Tant que l'enfant n'a pas choisi lui-même un onglet, `active` continue
  // de suivre `initialActive` si sa valeur change (ex. une coche déclenche
  // un `revalidatePath` qui recalcule `currentMoment` côté serveur pendant
  // que la page reste ouverte, et l'heure a franchi une frontière depuis le
  // montage -- correctif de revue). Dès qu'il tape sur un onglet, cette
  // synchronisation s'arrête définitivement pour le reste de la session :
  // on ne le fait jamais revenir en arrière sur un onglet qu'il a
  // explicitement quitté.
  const hasManuallySelectedRef = useRef(false);
  useEffect(() => {
    if (!hasManuallySelectedRef.current) {
      setActive(initialActive);
    }
  }, [initialActive]);

  const tabRefs = useRef<Record<DayMoment, HTMLButtonElement | null>>({
    MATIN: null,
    RETOUR: null,
    SOIR: null,
  });

  function selectTab(id: DayMoment) {
    hasManuallySelectedRef.current = true;
    setActive(id);
  }

  // Même pattern clavier WAI-ARIA APG que EdtViewTabs (flèches gauche/droite,
  // Home/End) -- le focus suit la sélection (roving tabindex ci-dessous).
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = TABS[nextIndex];
    selectTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }

  const panels: Record<DayMoment, ReactNode> = {
    MATIN: matin,
    RETOUR: retour,
    SOIR: soir,
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Moment de la journée"
        className="flex gap-1 rounded-2xl bg-card p-1 ring-1 ring-border"
      >
        {TABS.map((tab, index) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`moment-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`moment-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                // Zone de tap >= 44px et texte >= 16px (plancher d'accessibilité).
                "min-h-[44px] flex-1 rounded-xl text-base font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`moment-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`moment-tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
