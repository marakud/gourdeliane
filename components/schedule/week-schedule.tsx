"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotRow } from "@/components/schedule/slot-row";
import { SlotFormDialog } from "@/components/schedule/slot-form-dialog";
import { NoSchoolDayPanel } from "@/components/schedule/no-school-day-panel";
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from "@/domain/schedule";

export interface WeekScheduleSlot {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
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

      {/* Vue semaine : une colonne empilée sur mobile ; à partir de la
          tablette (>= md, 768px), grille semaine complète (UX-DR13) --
          largeur de colonne minimale fixe (auto-fill) plutôt qu'un nombre de
          colonnes figé, pour que les 7 jours se répartissent naturellement
          sans jamais retomber sous le plancher de tap de 44px. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
        {WEEKDAYS.map((day) => {
          const daySlots = slotsByDay.get(day) ?? [];
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
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  Aucun créneau.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <NoSchoolDayPanel noSchoolDays={noSchoolDays} />
    </div>
  );
}
