"use client";

import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { weekdayOfIso, type FreeGap, type Weekday } from "@/domain/schedule";

// Calendrier unifié du formulaire de devoir (évolution CartableFlow) --
// remplace les deux anciens champs séparés et indépendants ("Échéance" en
// simple date, "Programmer dans l'EDT" en jour de semaine récurrent sans
// date réelle) : retour utilisateur -- un devoir "programmé samedi 11h" via
// l'ancien second champ n'apparaissait pas dans "Aujourd'hui" (page "Mes
// tâches", qui ne classe que par échéance) et n'affichait jamais de date
// réelle ("je ne vois pas les dates"). Ici, UNE seule date (vrai calendrier
// natif du navigateur, aucune limite de fenêtre -- une échéance lointaine
// reste possible, contrairement à une liste de jours proches) sert à la
// fois d'échéance ET de placement dans l'EDT du jour concerné.
// L'heure, une fois une date choisie, ne propose que les trous libres du
// jour de semaine correspondant (mêmes `weeklyGaps` qu'avant,
// domain/schedule.ts::computeWeeklyFreeGaps) -- toujours une heure sans
// contrainte de date (l'alternance semaine A/B et les jours "sans cours" ne
// sont pas pris en compte ici, même simplification assumée que l'ancien
// sélecteur).

export interface EcheancePickerValue {
  dateIso: string; // "yyyy-MM-dd", "" si aucune échéance
  time: string; // "HH:mm", "" si aucune heure précise
}

export interface EcheancePickerProps {
  weeklyGaps: Record<Weekday, FreeGap[]>;
  value: EcheancePickerValue;
  onChange: (value: EcheancePickerValue) => void;
}

function gapContaining(
  gaps: readonly FreeGap[],
  time: string
): FreeGap | undefined {
  if (!time) return undefined;
  return gaps.find((gap) => time >= gap.start && time <= gap.end);
}

export function EcheancePicker({ weeklyGaps, value, onChange }: EcheancePickerProps) {
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
      <Label htmlFor="devoir-echeance">Échéance (optionnel)</Label>
      <Input
        id="devoir-echeance"
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
              <label htmlFor="devoir-echeance-time" className="text-sm text-muted-foreground">
                Heure précise
              </label>
              <Input
                id="devoir-echeance-time"
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
