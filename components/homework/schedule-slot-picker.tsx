"use client";

import { Check } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import { cn } from "@/lib/utils";
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from "@/domain/schedule";

// Sélecteur "Programmer dans l'EDT" du FAB devoirs -- mini grille type EDT
// (retour utilisateur : "de manière plus visuelle" plutôt qu'une liste
// déroulante de texte). Lecture + sélection seulement : pas d'ajout/édition/
// suppression de créneau ici, ça reste le rôle de l'écran EDT
// (components/schedule/slot-row.tsx). Regroupement par jour mirror
// `WeekSchedule` (components/schedule/week-schedule.tsx), simplifié en
// rangée de puces plutôt qu'un planning complet -- ce composant vit dans un
// formulaire modal, pas la page EDT elle-même.

export interface ScheduleSlotPickerSlot {
  id: string;
  weekday: Weekday;
  startTime: string;
  subject: { name: string; colorIndex: number };
}

export interface ScheduleSlotPickerProps {
  slots: ScheduleSlotPickerSlot[];
  value: string | null;
  onChange: (slotId: string | null) => void;
}

export function ScheduleSlotPicker({
  slots,
  value,
  onChange,
}: ScheduleSlotPickerProps) {
  const slotsByDay = new Map<Weekday, ScheduleSlotPickerSlot[]>();
  for (const slot of slots) {
    const list = slotsByDay.get(slot.weekday) ?? [];
    list.push(slot);
    slotsByDay.set(slot.weekday, list);
  }
  for (const list of slotsByDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const days = WEEKDAYS.filter((day) => (slotsByDay.get(day)?.length ?? 0) > 0);

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
            {slotsByDay.get(day)!.map((slot) => {
              const selected = value === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onChange(selected ? null : slot.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-[44px] items-center gap-1.5 rounded-full px-2.5 text-sm ring-1 transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-muted text-foreground ring-border"
                  )}
                >
                  <SubjectTag
                    name={slot.subject.name}
                    colorIndex={slot.subject.colorIndex}
                    className="size-5 text-[0.6rem]"
                  />
                  {slot.startTime}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
