"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WEEKDAYS, WEEKDAY_LABELS, type FreeGap, type Weekday } from "@/domain/schedule";

// Sélecteur "Programmer dans l'EDT" du FAB devoirs -- mini grille type EDT
// (retour utilisateur : mini grille visuelle) montrant les trous LIBRES de
// la semaine (lundi-dimanche, 8h-22h -- `domain/schedule.ts::computeWeeklyFreeGaps`),
// jamais les créneaux/cours eux-mêmes : l'objectif est de trouver de la
// disponibilité, pas de coller le devoir à un cours (2e retour utilisateur
// Story 2.4, remplace le premier essai "rattacher à un créneau existant").
// Tap un trou -> révèle un `<input type="time">` borné (`min`/`max`) aux
// limites de ce trou, pour "laisser la possibilité de paramétrer" l'heure
// exacte (retour utilisateur) plutôt qu'imposer le début du trou.

export interface FreeTimePickerValue {
  weekday: Weekday;
  startTime: string;
}

export interface FreeTimePickerProps {
  weeklyGaps: Record<Weekday, FreeGap[]>;
  value: FreeTimePickerValue | null;
  onChange: (value: FreeTimePickerValue | null) => void;
}

// Bornes inclusives des deux côtés : le navigateur traite `max` d'un
// `<input type="time">` comme inclusif, donc choisir exactement `gap.end`
// est une valeur légale -- si cette fonction excluait `gap.end` (comme dans
// une première version), ce choix ne retrouvait plus son propre trou au
// rendu suivant, et le bloc "Heure précise" disparaissait avec lui (bug de
// revue).
function gapContaining(
  gaps: readonly FreeGap[],
  time: string | undefined
): FreeGap | undefined {
  if (!time) return undefined;
  return gaps.find((gap) => time >= gap.start && time <= gap.end);
}

export function FreeTimePicker({
  weeklyGaps,
  value,
  onChange,
}: FreeTimePickerProps) {
  const days = WEEKDAYS.filter((day) => (weeklyGaps[day]?.length ?? 0) > 0);

  function selectGap(day: Weekday, gap: FreeGap) {
    onChange({ weekday: day, startTime: gap.start });
  }

  function handleTimeChange(day: Weekday, gap: FreeGap, time: string) {
    if (time < gap.start || time > gap.end) return;
    onChange({ weekday: day, startTime: time });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl ring-1 ring-border p-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          "flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-left text-base",
          value === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {value === null && <Check aria-hidden="true" className="size-4" />}
        Aucun créneau
      </button>

      {days.map((day) => (
        <div key={day} className="flex flex-col gap-1">
          <span className="px-1 text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS[day]}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {weeklyGaps[day].map((gap) => {
              const selectedGap =
                value?.weekday === day &&
                gapContaining(weeklyGaps[day], value.startTime) === gap;
              return (
                <button
                  key={`${gap.start}-${gap.end}`}
                  type="button"
                  onClick={() => selectGap(day, gap)}
                  aria-pressed={selectedGap}
                  className={cn(
                    "flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition-colors",
                    selectedGap
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-muted text-foreground ring-border"
                  )}
                >
                  {gap.start}–{gap.end}
                </button>
              );
            })}
          </div>

          {value?.weekday === day &&
            (() => {
              const activeGap = gapContaining(weeklyGaps[day], value.startTime);
              if (!activeGap) return null;
              return (
                <div className="flex items-center gap-2 pl-1 pt-1">
                  <label
                    htmlFor={`free-time-${day}`}
                    className="text-sm text-muted-foreground"
                  >
                    Heure précise
                  </label>
                  <Input
                    id={`free-time-${day}`}
                    type="time"
                    min={activeGap.start}
                    max={activeGap.end}
                    value={value.startTime}
                    onChange={(e) => handleTimeChange(day, activeGap, e.target.value)}
                    className="h-11 w-32 text-base"
                  />
                </div>
              );
            })()}
        </div>
      ))}
    </div>
  );
}
