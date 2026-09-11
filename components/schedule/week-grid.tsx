"use client";

import { Plus, Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotFormDialog } from "@/components/schedule/slot-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  WEEK_PARITY_FULL_LABELS,
  WEEK_PARITY_LABELS,
  computeGridWindow,
  computeSlotLayout,
  normalizeSubjectColorIndex,
  timeToMinutes,
  type WeekParity,
  type Weekday,
} from "@/domain/schedule";

// Grille horaire réelle de la vue Semaine (Story 1.5, ≥768px -- la vue liste
// mobile, components/schedule/week-schedule.tsx, reste inchangée en dessous
// de ce seuil). Chaque créneau est positionné/dimensionné selon son horaire
// réel (1 minute = 1px, cf. GRID_PX_PER_MINUTE) plutôt que listé
// verticalement -- ressemble à un vrai emploi du temps scolaire.

export interface WeekGridSlot {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  weekParity: WeekParity | null;
  subject: { name: string; colorIndex: number };
}

export interface WeekGridProps {
  slots: WeekGridSlot[];
  subjectNames: string[];
}

const GRID_PX_PER_MINUTE = 1;
// Hauteur plancher d'une case, même pour un créneau très court (ex. 30 min)
// -- reste tapable plutôt que rognée/illisible (Boundaries spec 1.5).
const MIN_BLOCK_HEIGHT_PX = 40;
const GUTTER_WIDTH_PX = 48;

export function WeekGrid({ slots, subjectNames }: WeekGridProps) {
  const gridWindow = computeGridWindow(slots);
  const windowStartMinutes = timeToMinutes(gridWindow.start);
  const windowEndMinutes = timeToMinutes(gridWindow.end);
  const windowMinutes = windowEndMinutes - windowStartMinutes;
  const gridHeightPx = windowMinutes * GRID_PX_PER_MINUTE;

  const hourMarks: string[] = [];
  for (let m = windowStartMinutes; m <= windowEndMinutes; m += 60) {
    const hours = Math.floor(m / 60);
    hourMarks.push(`${hours}h`);
  }

  // Tri chronologique explicite (même garde que la vue liste,
  // week-schedule.tsx) -- sans ceci, l'ordre DOM/tabulation d'une colonne ne
  // serait garanti que si `slots` arrive déjà trié, ce qu'aucun contrat
  // d'appel ne promet (correctif de revue).
  const sortedSlots = [...slots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  const slotsByDay = new Map<Weekday, WeekGridSlot[]>(
    WEEKDAYS.map((day) => [day, []])
  );
  for (const slot of sortedSlots) {
    slotsByDay.get(slot.weekday)?.push(slot);
  }

  return (
    <div
      className="relative grid max-h-[720px] gap-x-1 overflow-y-auto overflow-x-auto"
      style={{
        gridTemplateColumns: `${GUTTER_WIDTH_PX}px repeat(7, minmax(64px, 1fr))`,
      }}
    >
      {slots.length === 0 && (
        // Refonte visuelle étape 6 -- même icône que DayView (Sofa, "rien de
        // prévu") pour rester cohérent : c'est le même concept ("aucun
        // créneau"), juste à l'échelle de la semaine plutôt que du jour.
        // `z-10` (correctif découvert en vérifiant cette étape, préexistant
        // à la refonte) : sans lui, ce message -- premier enfant de la grille
        // en position absolute -- se retrouvait entièrement recouvert par
        // les colonnes de jours (`bg-card`, `position: relative`, plus tard
        // dans le DOM), invisible sauf sur la mince ligne de `gap-x-1` entre
        // deux colonnes.
        <EmptyState
          icon={Sofa}
          message="Aucun créneau cette semaine."
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2"
        />
      )}
      <div />
      {WEEKDAYS.map((day) => (
        <div
          key={`header-${day}`}
          className="flex items-center justify-between gap-1 px-1 pb-2"
        >
          <span className="font-heading text-sm font-semibold text-foreground">
            {WEEKDAY_LABELS[day]}
          </span>
          <SlotFormDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Ajouter un créneau le ${WEEKDAY_LABELS[day].toLowerCase()}`}
                className="size-8"
              >
                <Plus aria-hidden="true" className="size-4" />
              </Button>
            }
            existingSubjectNames={subjectNames}
            defaultWeekday={day}
          />
        </div>
      ))}

      <div className="relative" style={{ height: gridHeightPx }}>
        {hourMarks.map((label, index) => (
          <span
            key={label}
            className="absolute right-1 -translate-y-1/2 text-xs text-muted-foreground"
            style={{ top: index * 60 * GRID_PX_PER_MINUTE }}
          >
            {label}
          </span>
        ))}
      </div>

      {WEEKDAYS.map((day) => {
        const daySlots = slotsByDay.get(day) ?? [];
        const groups = groupByStartTime(daySlots);

        return (
          <div
            key={`body-${day}`}
            className="relative rounded-lg bg-card ring-1 ring-border"
            style={{
              height: gridHeightPx,
              backgroundImage:
                "repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent 60px)",
            }}
          >
            {groups.map((group) =>
              group.map((slot, indexInGroup) => {
                const { topPercent, heightPercent } = computeSlotLayout(
                  slot,
                  gridWindow.start,
                  gridWindow.end
                );
                const rawTop = (topPercent / 100) * gridHeightPx;
                const height = Math.max(
                  (heightPercent / 100) * gridHeightPx,
                  MIN_BLOCK_HEIGHT_PX
                );
                // Le plancher de hauteur ci-dessus grandit vers le bas -- sans
                // cette compensation, un créneau court en toute fin de
                // fenêtre déborderait de la colonne (correctif de revue :
                // ex. 17h30-18h dans une fenêtre 8h-18h, hauteur portée à
                // 40px alors qu'il ne reste que 30px avant le bas de la
                // colonne). On remonte `top` d'autant que nécessaire, jamais
                // sous 0.
                const top = Math.max(0, Math.min(rawTop, gridHeightPx - height));
                const widthPercent = 100 / group.length;

                // `aria-label` sur le déclencheur remplace tout texte
                // descendant pour le nom accessible (y compris un éventuel
                // <span className="sr-only">) -- la parité doit donc être
                // incluse directement dans ce libellé, sinon deux cases
                // Semaine A / Semaine B côte à côte deviennent
                // indiscernables au clavier/lecteur d'écran (correctif de
                // revue).
                const parityLabel = slot.weekParity
                  ? `, ${WEEK_PARITY_FULL_LABELS[slot.weekParity]}`
                  : "";
                const ariaLabel = `Modifier le créneau ${slot.subject.name}, ${WEEKDAY_LABELS[day].toLowerCase()} ${slot.startTime}-${slot.endTime}${parityLabel}`;

                return (
                  <SlotFormDialog
                    key={slot.id}
                    trigger={
                      <button
                        type="button"
                        aria-label={ariaLabel}
                        className="absolute flex flex-col items-start overflow-hidden rounded-md px-1.5 py-1 text-left text-white shadow-sm"
                        style={{
                          top,
                          height,
                          left: `${indexInGroup * widthPercent}%`,
                          // `max()` garde une largeur tapable même si 3+
                          // créneaux partagent le même jour+horaire (aucune
                          // validation de non-chevauchement n'empêche ce cas,
                          // correctif de revue) -- au-delà, les cases se
                          // chevauchent légèrement plutôt que de devenir
                          // untappables.
                          width: `max(calc(${widthPercent}% - 2px), 28px)`,
                          backgroundColor: `var(--subject-${normalizeSubjectColorIndex(slot.subject.colorIndex)})`,
                        }}
                      >
                        <span className="w-full truncate text-xs font-semibold">
                          {slot.subject.name}
                        </span>
                        <span className="w-full truncate text-[0.65rem] opacity-90">
                          {slot.startTime}–{slot.endTime}
                        </span>
                        {slot.weekParity && (
                          // Fond quasi opaque (pas un simple voile clair) --
                          // un `bg-black/20` échouait le contraste AA sur les
                          // couleurs de matière claires (ex. --subject-4
                          // ambre, correctif de revue) ; déjà décrit dans
                          // `aria-label` ci-dessus, donc purement visuel ici
                          // (`aria-hidden`).
                          <span
                            aria-hidden="true"
                            className="absolute right-1 top-1 rounded bg-black/75 px-1 text-[0.6rem] font-medium leading-tight text-white"
                          >
                            {WEEK_PARITY_LABELS[slot.weekParity]}
                          </span>
                        )}
                      </button>
                    }
                    existingSubjectNames={subjectNames}
                    showDeleteButton
                    slot={{
                      id: slot.id,
                      weekday: slot.weekday,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                      subjectName: slot.subject.name,
                      weekParity: slot.weekParity,
                    }}
                  />
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

function groupByStartTime(slots: WeekGridSlot[]): WeekGridSlot[][] {
  const byStartTime = new Map<string, WeekGridSlot[]>();
  for (const slot of slots) {
    const list = byStartTime.get(slot.startTime) ?? [];
    list.push(slot);
    byStartTime.set(slot.startTime, list);
  }
  for (const group of byStartTime.values()) {
    group.sort((a, b) => (a.weekParity ?? "").localeCompare(b.weekParity ?? ""));
  }
  return [...byStartTime.values()];
}
