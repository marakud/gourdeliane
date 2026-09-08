"use client";

import { useId, useMemo, useState, useTransition, type FormEvent, type ReactElement } from "react";
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
import {
  createDevoirAction,
  updateDevoirAction,
  type DevoirFormInput,
} from "@/actions/homework";
import {
  FreeTimePicker,
  type FreeTimePickerValue,
} from "@/components/homework/free-time-picker";
import { computeWeeklyFreeGaps, type Weekday } from "@/domain/schedule";

// Formulaire d'un devoir, factorisé pour être partagé entre la création
// (AddHomeworkFab) et l'édition (retour utilisateur -- DevoirsList) --
// mirror exact du pattern SlotFormDialog (components/schedule/slot-form-dialog.tsx)
// : un seul composant, `devoir` présent uniquement en mode édition.

export interface HomeworkFormDialogSubject {
  id: string;
  name: string;
  colorIndex: number;
}

export interface HomeworkFormDialogSlot {
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

export interface HomeworkFormDialogDevoir {
  id: string;
  subjectId: string;
  description: string;
  aRendre: boolean;
  echeance: string; // ISO "yyyy-MM-dd", "" si aucune
  plannedWeekday: string; // code Weekday, "" si non programmé
  plannedStartTime: string; // "HH:mm", "" si non programmé
}

export interface HomeworkFormDialogProps {
  trigger: ReactElement;
  subjects: HomeworkFormDialogSubject[];
  scheduleSlots?: HomeworkFormDialogSlot[];
  // Présent uniquement en mode édition.
  devoir?: HomeworkFormDialogDevoir;
  // Notifie le parent de l'état "enregistrement en cours" (retour
  // utilisateur -- DevoirsList l'utilise pour désactiver les boutons
  // cocher/supprimer de la même ligne pendant l'édition, avec le même
  // `pendingIds` que ces deux actions, pour éviter qu'une suppression ne
  // s'exécute concurremment à une modification de la même ligne).
  onPendingChange?: (pending: boolean) => void;
}

const EMPTY_FORM: DevoirFormInput = {
  subjectId: "",
  description: "",
  aRendre: false,
  echeance: "",
  plannedWeekday: "",
  plannedStartTime: "",
};

function toFormInput(
  devoir: HomeworkFormDialogDevoir | undefined,
  defaultSubjectId: string
): DevoirFormInput {
  if (!devoir) {
    return { ...EMPTY_FORM, subjectId: defaultSubjectId };
  }
  return {
    subjectId: devoir.subjectId,
    description: devoir.description,
    aRendre: devoir.aRendre,
    echeance: devoir.echeance,
    plannedWeekday: devoir.plannedWeekday,
    plannedStartTime: devoir.plannedStartTime,
  };
}

export function HomeworkFormDialog({
  trigger,
  subjects,
  scheduleSlots = [],
  devoir,
  onPendingChange,
}: HomeworkFormDialogProps) {
  const isEdit = Boolean(devoir);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DevoirFormInput>(
    toFormInput(devoir, subjects[0]?.id ?? "")
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ariaCheckboxId = useId();

  // Recalculé seulement quand `scheduleSlots` change (pas à chaque frappe
  // dans description/échéance -- correctif de revue Story 2.4).
  const weeklyGaps = useMemo(
    () => computeWeeklyFreeGaps(scheduleSlots),
    [scheduleSlots]
  );
  const plannedValue: FreeTimePickerValue | null =
    form.plannedWeekday && form.plannedStartTime
      ? {
          weekday: form.plannedWeekday as Weekday,
          startTime: form.plannedStartTime,
        }
      : null;

  function resetAndOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setForm(toFormInput(devoir, subjects[0]?.id ?? ""));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    onPendingChange?.(true);

    startTransition(async () => {
      const result = isEdit
        ? await updateDevoirAction(devoir!.id, form)
        : await createDevoirAction(form);
      onPendingChange?.(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Ferme immédiatement, sans écran de confirmation (Boundaries spec 2.4).
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={resetAndOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le devoir" : "Ajouter un devoir"}</DialogTitle>
          <DialogDescription>
            Matière et description suffisent -- le reste est facultatif.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="devoir-subject">Matière</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ajoute d&apos;abord une matière depuis l&apos;emploi du temps.
              </p>
            ) : (
              <Select
                value={form.subjectId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, subjectId: value as string }))
                }
              >
                <SelectTrigger id="devoir-subject" className="h-11 w-full text-base">
                  <SelectValue>
                    {(value: string | null) =>
                      subjects.find((subject) => subject.id === value)?.name ??
                      "Choisis une matière"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="devoir-description">Description</Label>
            <Input
              id="devoir-description"
              required
              autoFocus
              placeholder="ex. Exercices p.42"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="h-11 text-base"
            />
          </div>

          <label
            htmlFor={ariaCheckboxId}
            className="flex min-h-[44px] items-center gap-3 rounded-xl bg-muted px-3 py-2"
          >
            <input
              id={ariaCheckboxId}
              type="checkbox"
              checked={form.aRendre ?? false}
              onChange={(e) =>
                setForm((f) => ({ ...f, aRendre: e.target.checked }))
              }
              className="size-5 shrink-0 rounded border-input"
            />
            <span className="text-base text-foreground">À rendre</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="devoir-echeance">Échéance (optionnel)</Label>
            <Input
              id="devoir-echeance"
              type="date"
              value={form.echeance ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, echeance: e.target.value }))
              }
              className="h-11 text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Programmer dans l&apos;EDT (optionnel)</Label>
            <FreeTimePicker
              weeklyGaps={weeklyGaps}
              value={plannedValue}
              onChange={(next) =>
                setForm((f) => ({
                  ...f,
                  plannedWeekday: next?.weekday ?? "",
                  plannedStartTime: next?.startTime ?? "",
                }))
              }
            />
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
            <Button
              type="submit"
              disabled={isPending || subjects.length === 0}
              className="h-11 min-w-[44px]"
            >
              {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
