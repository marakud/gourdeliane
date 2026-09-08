"use client";

import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectTag } from "@/components/schedule/subject-tag";
import { SlotFormDialog } from "@/components/schedule/slot-form-dialog";
import { deleteSlot } from "@/actions/schedule";
import {
  WEEK_PARITY_FULL_LABELS,
  WEEK_PARITY_LABELS,
  type WeekParity,
  type Weekday,
} from "@/domain/schedule";

export interface SlotRowProps {
  slot: {
    id: string;
    weekday: Weekday;
    startTime: string;
    endTime: string;
    weekParity: WeekParity | null;
    subject: { name: string; colorIndex: number };
  };
  existingSubjectNames: string[];
  onError: (message: string) => void;
}

export function SlotRow({ slot, existingSubjectNames, onError }: SlotRowProps) {
  const [isDeleting, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSlot(slot.id);
      if (!result.ok) {
        onError(result.error);
      }
    });
  }

  return (
    <li className="flex min-h-[44px] items-center gap-3 rounded-2xl bg-muted px-3 py-2">
      <SubjectTag name={slot.subject.name} colorIndex={slot.subject.colorIndex} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-semibold text-foreground">
          {slot.subject.name}
        </span>
        <span className="text-sm text-muted-foreground">
          {slot.startTime} – {slot.endTime}
        </span>
      </div>
      {slot.weekParity && (
        <span
          title={WEEK_PARITY_FULL_LABELS[slot.weekParity]}
          className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
        >
          <span aria-hidden="true">{WEEK_PARITY_LABELS[slot.weekParity]}</span>
          <span className="sr-only">{WEEK_PARITY_FULL_LABELS[slot.weekParity]}</span>
        </span>
      )}
      <SlotFormDialog
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Modifier le créneau ${slot.subject.name}`}
            className="size-11"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
        }
        existingSubjectNames={existingSubjectNames}
        slot={{
          id: slot.id,
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectName: slot.subject.name,
          weekParity: slot.weekParity,
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Supprimer le créneau ${slot.subject.name}`}
        disabled={isDeleting}
        onClick={handleDelete}
        className="size-11 text-destructive hover:text-destructive"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </li>
  );
}
