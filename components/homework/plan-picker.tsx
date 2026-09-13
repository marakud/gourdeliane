"use client";

import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { weekdayOfIso, type FreeGap, type Weekday } from "@/domain/schedule";

// Calendrier de planification du formulaire de devoir (évolution
// CartableFlow) -- distinct de l'Échéance (date de rendu fixée par l'école,
// simple `<input type="date">` dans HomeworkFormDialog) : celui-ci répond à
// "quand l'ÉLÈVE prévoit de s'y mettre", potentiellement bien avant (ou
// après, en rattrapage) l'échéance réelle. Retour utilisateur -- une
// première version de cette évolution avait fusionné les deux notions en un
// seul champ, ce qui empêchait de distinguer "dû le 20" de "je compte le
// faire samedi" et cassait le classement "Mes tâches" (un devoir "prévu
// samedi 11h" ne remontait plus dans "Aujourd'hui").
//
// Un vrai calendrier natif (aucune limite de fenêtre -- une planification
// lointaine reste possible) suivi, une fois une date choisie, des trous
// libres du jour de semaine correspondant (mêmes `weeklyGaps` qu'avant,
// domain/schedule.ts::computeWeeklyFreeGaps) pour préciser une heure. Cette
// heure ne tient pas compte de l'alternance semaine A/B ni des jours "sans
// cours" -- même simplification assumée que l'ancien sélecteur (Story 2.4).

export interface PlanPickerValue {
  dateIso: string; // "yyyy-MM-dd", "" si aucune planification
  time: string; // "HH:mm", "" si aucune heure précise
}

export interface PlanPickerProps {
  weeklyGaps: Record<Weekday, FreeGap[]>;
  value: PlanPickerValue;
  onChange: (value: PlanPickerValue) => void;
}

function gapContaining(
  gaps: readonly FreeGap[],
  time: string
): FreeGap | undefined {
  if (!time) return undefined;
  return gaps.find((gap) => time >= gap.start && time <= gap.end);
}

export function PlanPicker({ weeklyGaps, value, onChange }: PlanPickerProps) {
  const gaps = value.dateIso ? weeklyGaps[weekdayOfIso(value.dateIso)] : [];
  const activeGap = gapContaining(gaps, value.time);

  function handleDateChange(dateIso: string) {
    if (!dateIso) {
      onChange({ dateIso: "", time: "" });
      return;
    }
    // Changer de date peut changer de jour de semaine, donc de trous libres
    // -- une heure déjà choisie qui ne correspond plus à aucun trou du
    // nouveau jour est réinitialisée plutôt que silencieusement conservée
    // (elle deviendrait invalide côté serveur, actions/homework.ts).
    const nextGaps = weeklyGaps[weekdayOfIso(dateIso)];
    const stillValid = value.time && gapContaining(nextGaps, value.time);
    onChange({ dateIso, time: stillValid ? value.time : "" });
  }

  function selectGap(gap: FreeGap) {
    onChange({ dateIso: value.dateIso, time: gap.start });
  }

  function handleTimeChange(time: string) {
    if (!activeGap || time < activeGap.start || time > activeGap.end) return;
    onChange({ dateIso: value.dateIso, time });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="devoir-plan-date">Quand vas-tu le faire ? (optionnel)</Label>
      <Input
        id="devoir-plan-date"
        type="date"
        value={value.dateIso}
        onChange={(e) => handleDateChange(e.target.value)}
        className="h-11 text-base"
      />

      {value.dateIso && gaps.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl ring-1 ring-border p-2">
          <span className="px-1 text-xs font-medium text-muted-foreground">
            Heure précise (optionnel) -- trous libres ce jour-là
          </span>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((gap) => {
              const selected = activeGap === gap;
              return (
                <button
                  key={`${gap.start}-${gap.end}`}
                  type="button"
                  onClick={() => selectGap(gap)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-muted text-foreground ring-border"
                  )}
                >
                  {selected && <Check aria-hidden="true" className="size-3.5" />}
                  {gap.start}–{gap.end}
                </button>
              );
            })}
            {value.time && (
              <button
                type="button"
                onClick={() => onChange({ dateIso: value.dateIso, time: "" })}
                className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-muted px-3 text-sm text-muted-foreground ring-1 ring-border"
              >
                <X aria-hidden="true" className="size-3.5" />
                Retirer l&apos;heure
              </button>
            )}
          </div>

          {activeGap && (
            <div className="flex items-center gap-2 pl-1 pt-1">
              <label htmlFor="devoir-plan-time" className="text-sm text-muted-foreground">
                Heure précise
              </label>
              <Input
                id="devoir-plan-time"
                type="time"
                min={activeGap.start}
                max={activeGap.end}
                value={value.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="h-11 w-32 text-base"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
