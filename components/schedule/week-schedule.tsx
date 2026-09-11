"use client";

import { useState } from "react";
import { Plus, Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotRow } from "@/components/schedule/slot-row";
import { SlotFormDialog } from "@/components/schedule/slot-form-dialog";
import { NoSchoolDayPanel } from "@/components/schedule/no-school-day-panel";
import { WeekGrid } from "@/components/schedule/week-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAYS, WEEKDAY_LABELS, type WeekParity, type Weekday } from "@/domain/schedule";

export interface WeekScheduleSlot {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  weekParity: WeekParity | null;
  subject: { name: string; colorIndex: number };
}

export interface WeekScheduleProps {
  slots: WeekScheduleSlot[];
  subjectNames: string[];
  noSchoolDays: { date: string }[];
}

export function WeekSchedule({
  slots,
  subjectNames,
  noSchoolDays,
}: WeekScheduleProps) {
  const [error, setError] = useState<string | null>(null);

  const slotsByDay = new Map<Weekday, WeekScheduleSlot[]>(
    WEEKDAYS.map((day) => [day, []])
  );
  for (const slot of slots) {
    slotsByDay.get(slot.weekday)?.push(slot);
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      {/* Grille horaire réelle à partir de la tablette (>= md, 768px, Story
          1.5) -- écran trop étroit en dessous pour une grille lisible, la
          vue liste ci-dessous reste alors la seule vue (UX-DR13). */}
      <div className="hidden md:block">
        <WeekGrid slots={slots} subjectNames={subjectNames} />
      </div>

      {/* Vue liste : une colonne empilée, mobile uniquement (< md) --
          inchangée depuis la Story 1.2/1.4, cf. Design Notes spec 1.5. */}
      <div className="flex flex-col gap-4 md:hidden">
        {WEEKDAYS.map((day) => {
          // Tri stable horaire puis parité (Story 1.4) : désambiguïse deux
          // matières au même jour+horaire (semaine A puis B), ordre
          // déterministe même si le backend renvoie un ordre différent.
          const daySlots = [...(slotsByDay.get(day) ?? [])].sort((a, b) => {
            const byTime = a.startTime.localeCompare(b.startTime);
            if (byTime !== 0) return byTime;
            return (a.weekParity ?? "").localeCompare(b.weekParity ?? "");
          });
          return (
            <section
              key={day}
              aria-labelledby={`day-${day}-heading`}
              className="flex flex-col gap-2 rounded-2xl bg-card p-3 ring-1 ring-border"
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id={`day-${day}-heading`}
                  className="font-heading text-base font-semibold text-foreground"
                >
                  {WEEKDAY_LABELS[day]}
                </h2>
                <SlotFormDialog
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Ajouter un créneau le ${WEEKDAY_LABELS[day].toLowerCase()}`}
                      className="size-11"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </Button>
                  }
                  existingSubjectNames={subjectNames}
                  defaultWeekday={day}
                />
              </div>

              {daySlots.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {daySlots.map((slot) => (
                    <SlotRow
                      key={slot.id}
                      slot={slot}
                      existingSubjectNames={subjectNames}
                      onError={setError}
                    />
                  ))}
                </ul>
              ) : (
                // Refonte visuelle étape 7 -- même icône/famille que DayView
                // (Sofa) : même concept ("rien de prévu"), à l'échelle d'un
                // jour de cette vue liste.
                <EmptyState
                  icon={Sofa}
                  message="Aucun créneau."
                  layout="inline"
                  className="px-1 py-2 text-sm"
                />
              )}
            </section>
          );
        })}
      </div>

      <NoSchoolDayPanel noSchoolDays={noSchoolDays} />
    </div>
  );
}
