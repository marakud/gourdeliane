"use client";

import { useId, useMemo, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
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
import { createDevoirAction, type DevoirFormInput } from "@/actions/homework";
import {
  FreeTimePicker,
  type FreeTimePickerValue,
} from "@/components/homework/free-time-picker";
import { computeWeeklyFreeGaps, type Weekday } from "@/domain/schedule";

// FAB "Ajouter un devoir", dupliqué sur Accueil et EDT (Boundaries spec 2.4 :
// pas de layout partagé pour ces deux routes, cf. app/layout.tsx) -- même
// composant instancié deux fois plutôt que d'introduire un wrapper
// conditionnel sur usePathname() (Design Notes). Formulaire mirror
// `SlotFormDialog` (components/schedule/slot-form-dialog.tsx) : Dialog +
// Select + Input, `useTransition`, ferme immédiatement au submit réussi
// (Boundaries : "sans écran de confirmation"). Placement dans un trou libre
// de l'EDT ("programmer le devoir dans l'EDT", retour utilisateur Story
// 2.4 -- 2e itération : disponibilité réelle, pas un rattachement à un
// cours) via `FreeTimePicker` -- mini grille type EDT, `computeWeeklyFreeGaps`
// (domain/schedule.ts) calculée ici à partir des créneaux bruts reçus.

export interface AddHomeworkFabSubject {
  id: string;
  name: string;
  colorIndex: number;
}

export interface AddHomeworkFabSlot {
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

export interface AddHomeworkFabProps {
  subjects: AddHomeworkFabSubject[];
  scheduleSlots?: AddHomeworkFabSlot[];
}

const EMPTY_FORM: DevoirFormInput = {
  subjectId: "",
  description: "",
  aRendre: false,
  echeance: "",
  plannedWeekday: "",
  plannedStartTime: "",
};

export function AddHomeworkFab({
  subjects,
  scheduleSlots = [],
}: AddHomeworkFabProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DevoirFormInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ariaCheckboxId = useId();

  // Recalculé seulement quand `scheduleSlots` change (pas à chaque frappe
  // dans description/échéance -- correctif de revue).
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
      setForm({
        ...EMPTY_FORM,
        subjectId: subjects[0]?.id ?? "",
      });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createDevoirAction(form);
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
      <DialogTrigger
        render={
          <Button
            type="button"
            aria-label="Ajouter un devoir"
            className="fixed bottom-20 right-4 z-20 size-14 rounded-full shadow-lg"
          />
        }
      >
        <Plus aria-hidden="true" className="size-6" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un devoir</DialogTitle>
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
              {isPending ? "Enregistrement..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
