"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DayView,
  type DayViewPlannedDevoir,
  type DayViewSlot,
} from "@/components/schedule/day-view";
import {
  WeekSchedule,
  type WeekScheduleSlot,
} from "@/components/schedule/week-schedule";

// Bascule Aujourd'hui / Demain / Semaine (Story 1.3, FR-2) au-dessus de
// l'écran EDT existant (Story 1.2). Les trois vues sont déjà calculées
// côté serveur (app/edt/page.tsx, AD-4) -- ce composant ne fait que garder
// l'onglet actif en mémoire côté client, aucun calcul de date ici.
export interface EdtViewTabsProps {
  today: {
    slots: DayViewSlot[];
    plannedDevoirs?: DayViewPlannedDevoir[];
    emptyMessage: string;
  };
  tomorrow: {
    slots: DayViewSlot[];
    plannedDevoirs?: DayViewPlannedDevoir[];
    emptyMessage: string;
  };
  week: {
    slots: WeekScheduleSlot[];
    subjectNames: string[];
    noSchoolDays: { date: string }[];
  };
}

type ViewId = "today" | "tomorrow" | "week";

// Refonte visuelle étape 7 -- une icône par onglet, même traitement que
// MomentTabs (étape 3, components/moment/moment-tabs.tsx). Famille
// "Calendar*" cohérente entre les trois (contrairement à Matin/Retour/Soir,
// pas d'icône déjà prise ailleurs sur cet écran à éviter) : `CalendarCheck`
// (aujourd'hui, en cours), `CalendarClock` (demain, à venir), `CalendarRange`
// (semaine, une plage de jours).
const TABS: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Aujourd'hui", icon: CalendarCheck },
  { id: "tomorrow", label: "Demain", icon: CalendarClock },
  { id: "week", label: "Semaine", icon: CalendarRange },
];

export function EdtViewTabs({ today, tomorrow, week }: EdtViewTabsProps) {
  const [active, setActive] = useState<ViewId>("today");
  const tabRefs = useRef<Record<ViewId, HTMLButtonElement | null>>({
    today: null,
    tomorrow: null,
    week: null,
  });

  // Pattern clavier standard des onglets (WAI-ARIA APG) : flèches gauche/
  // droite pour circuler, Home/End pour aller au premier/dernier -- en plus
  // du clic. Le focus suit la sélection (roving tabindex ci-dessous).
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
    setActive(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Vue de l'emploi du temps"
        className="flex gap-1 rounded-2xl bg-card p-1 ring-1 ring-border"
      >
        {TABS.map((tab, index) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`edt-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`edt-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                // Zone de tap >= 44px et texte >= 16px (plancher d'accessibilité).
                "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-base font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id="edt-panel-today"
        role="tabpanel"
        aria-labelledby="edt-tab-today"
        hidden={active !== "today"}
      >
        <DayView
          slots={today.slots}
          plannedDevoirs={today.plannedDevoirs}
          emptyMessage={today.emptyMessage}
        />
      </div>
      <div
        id="edt-panel-tomorrow"
        role="tabpanel"
        aria-labelledby="edt-tab-tomorrow"
        hidden={active !== "tomorrow"}
      >
        <DayView
          slots={tomorrow.slots}
          plannedDevoirs={tomorrow.plannedDevoirs}
          emptyMessage={tomorrow.emptyMessage}
        />
      </div>
      <div
        id="edt-panel-week"
        role="tabpanel"
        aria-labelledby="edt-tab-week"
        hidden={active !== "week"}
      >
        <WeekSchedule
          slots={week.slots}
          subjectNames={week.subjectNames}
          noSchoolDays={week.noSchoolDays}
        />
      </div>
    </div>
  );
}
