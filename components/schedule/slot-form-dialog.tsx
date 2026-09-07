"use client";

import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactElement,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from "@/domain/schedule";
import { createSlot, updateSlot, type SlotFormInput } from "@/actions/schedule";

export interface SlotFormDialogProps {
  trigger: ReactElement;
  existingSubjectNames: string[];
  // Présent uniquement en mode édition.
  slot?: {
    id: string;
    weekday: Weekday;
    startTime: string;
    endTime: string;
    subjectName: string;
  };
  // Pré-remplit le jour à la création depuis la colonne où l'enfant a tapé
  // "Ajouter" -- évite de le resélectionner à chaque créneau.
  defaultWeekday?: Weekday;
}

const EMPTY_FORM: SlotFormInput = {
  weekday: "MONDAY",
  startTime: "08:00",
  endTime: "09:00",
  subjectName: "",
};

export function SlotFormDialog({
  trigger,
  existingSubjectNames,
  slot,
  defaultWeekday,
}: SlotFormDialogProps) {
  const isEdit = Boolean(slot);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SlotFormInput>(
    slot ?? { ...EMPTY_FORM, weekday: defaultWeekday ?? EMPTY_FORM.weekday }
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const datalistId = useId();

  function resetAndOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setForm(slot ?? { ...EMPTY_FORM, weekday: defaultWeekday ?? EMPTY_FORM.weekday });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateSlot(slot!.id, form)
        : await createSlot(form);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={resetAndOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le créneau" : "Ajouter un créneau"}
          </DialogTitle>
          <DialogDescription>
            Un créneau se répète à l&apos;identique chaque semaine.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slot-subject">Matière</Label>
            <Input
              id="slot-subject"
              name="subjectName"
              list={datalistId}
              required
              autoComplete="off"
              placeholder="ex. Maths"
              value={form.subjectName}
              onChange={(e) =>
                setForm((f) => ({ ...f, subjectName: e.target.value }))
              }
              className="h-11 text-base"
            />
            <datalist id={datalistId}>
              {existingSubjectNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slot-weekday">Jour</Label>
            <Select
              value={form.weekday}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, weekday: value as Weekday }))
              }
            >
              <SelectTrigger id="slot-weekday" className="h-11 w-full text-base">
                <SelectValue>
                  {(value: Weekday | null) =>
                    value ? WEEKDAY_LABELS[value] : "Choisis un jour"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day} value={day}>
                    {WEEKDAY_LABELS[day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slot-start">Début</Label>
              <Input
                id="slot-start"
                name="startTime"
                type="time"
                required
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slot-end">Fin</Label>
              <Input
                id="slot-end"
                name="endTime"
                type="time"
                required
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
                className="h-11 text-base"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-[44px]"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending} className="h-11 min-w-[44px]">
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
