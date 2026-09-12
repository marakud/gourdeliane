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
import { EcheancePicker } from "@/components/homework/echeance-picker";
import { computeWeeklyFreeGaps, type Weekday } from "@/domain/schedule";
import { MAX_ESTIMATED_MINUTES } from "@/domain/homework";

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
  echeanceTime: string; // "HH:mm", "" si aucune heure précise
  estimatedMinutes: number | null;
}

// Évolution CartableFlow -- presets de durée estimée + option "Personnalisée"
// (saisie libre, bornée par MAX_ESTIMATED_MINUTES). "Aucune" reste la valeur
// par défaut : ce champ est facultatif (Boundaries -- ne freine jamais une
// saisie rapide).
const DURATION_PRESETS = [10, 15, 20, 30, 45, 60] as const;
const DURATION_SELECT_NONE = "none";
const DURATION_SELECT_CUSTOM = "custom";

function isCustomDuration(estimatedMinutes: number | undefined): boolean {
  return (
    estimatedMinutes !== undefined &&
    !(DURATION_PRESETS as readonly number[]).includes(estimatedMinutes)
  );
}

/**
 * Le champ Select seul ne peut pas distinguer "Aucune" de "Durée
 * personnalisée en cours de saisie, encore vide" -- les deux se traduisent
 * par `estimatedMinutes === undefined`. `customSelected` (état local du
 * composant, pas dérivable de `form` seul) tranche explicitement.
 */
function durationSelectValue(
  estimatedMinutes: number | undefined,
  customSelected: boolean
): string {
  if (customSelected) return DURATION_SELECT_CUSTOM;
  if (estimatedMinutes === undefined) return DURATION_SELECT_NONE;
  if ((DURATION_PRESETS as readonly number[]).includes(estimatedMinutes)) {
    return String(estimatedMinutes);
  }
  return DURATION_SELECT_CUSTOM;
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
  echeanceTime: "",
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
    echeanceTime: devoir.echeanceTime,
    estimatedMinutes: devoir.estimatedMinutes ?? undefined,
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
  // Voir `durationSelectValue` -- distinct de `form.estimatedMinutes` car
  // "Durée personnalisée" tout juste choisie et encore vide doit rester
  // affichée comme telle, pas retomber sur "Aucune".
  const [customDurationSelected, setCustomDurationSelected] = useState(() =>
    isCustomDuration(toFormInput(devoir, subjects[0]?.id ?? "").estimatedMinutes)
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

  function resetAndOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      const initial = toFormInput(devoir, subjects[0]?.id ?? "");
      setForm(initial);
      setCustomDurationSelected(isCustomDuration(initial.estimatedMinutes));
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="devoir-duration">Durée estimée (optionnel)</Label>
            <Select
              value={durationSelectValue(form.estimatedMinutes, customDurationSelected)}
              onValueChange={(value) => {
                if (value === DURATION_SELECT_NONE) {
                  setCustomDurationSelected(false);
                  setForm((f) => ({ ...f, estimatedMinutes: undefined }));
                } else if (value === DURATION_SELECT_CUSTOM) {
                  setCustomDurationSelected(true);
                  // Ne réinitialise pas une valeur personnalisée déjà saisie
                  // (ex. l'enfant rouvre le sélecteur par erreur) -- seule une
                  // valeur qui correspondrait à un preset serait ambiguë ici,
                  // et n'arrive jamais par ce chemin (les presets ont leur
                  // propre branche ci-dessous).
                } else {
                  setCustomDurationSelected(false);
                  setForm((f) => ({ ...f, estimatedMinutes: Number(value) }));
                }
              }}
            >
              <SelectTrigger id="devoir-duration" className="h-11 w-full text-base">
                <SelectValue>
                  {(value: string | null) => {
                    if (value === DURATION_SELECT_CUSTOM) return "Durée personnalisée";
                    if (!value || value === DURATION_SELECT_NONE) return "Aucune";
                    return value === "60" ? "1 heure" : `${value} minutes`;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DURATION_SELECT_NONE}>Aucune</SelectItem>
                {DURATION_PRESETS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes === 60 ? "1 heure" : `${minutes} minutes`}
                  </SelectItem>
                ))}
                <SelectItem value={DURATION_SELECT_CUSTOM}>Durée personnalisée</SelectItem>
              </SelectContent>
            </Select>
            {customDurationSelected && (
              <Input
                type="number"
                min={1}
                max={MAX_ESTIMATED_MINUTES}
                placeholder="Nombre de minutes"
                value={form.estimatedMinutes ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  setForm((f) => ({
                    ...f,
                    estimatedMinutes: raw === "" ? undefined : Number(raw),
                  }));
                }}
                className="h-11 text-base"
              />
            )}
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

          <EcheancePicker
            weeklyGaps={weeklyGaps}
            value={{ dateIso: form.echeance ?? "", time: form.echeanceTime ?? "" }}
            onChange={(next) =>
              setForm((f) => ({
                ...f,
                echeance: next.dateIso,
                echeanceTime: next.time,
              }))
            }
          />

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
