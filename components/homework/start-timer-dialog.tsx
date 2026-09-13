"use client";

import { useState, useTransition, type ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StartTimerAction } from "@/components/homework/devoirs-list";
import { MAX_ESTIMATED_MINUTES } from "@/domain/homework";
import { TIMER_MODE_CHRONO, TIMER_MODE_MINUTEUR } from "@/domain/homework-timer";

// Dialogue ouvert par le bouton "Commencer" (Play, devoir-row.tsx) --
// remplace l'ancien démarrage direct en un tap (retour utilisateur : "je
// souhaite avoir un chronomètre et un minuteur"). Chronométrer démarre
// immédiatement (chronomètre libre) ; Minuteur propose des présets (mêmes
// valeurs que la durée estimée d'un devoir, homework-form-dialog.tsx) +
// une durée personnalisée. Chaque choix démarre aussitôt et ferme le
// dialogue -- jamais un bouton "Confirmer" séparé pour les présets (même
// principe "un tap = un choix" que PlanPicker, sauf pour le champ
// personnalisé qui nécessite une saisie avant de pouvoir démarrer).

const MINUTEUR_PRESETS = [15, 30, 45, 60] as const;

export interface StartTimerDialogProps {
  trigger: ReactElement;
  devoirId: string;
  onStart: StartTimerAction;
  onPendingChange?: (pending: boolean) => void;
}

export function StartTimerDialog({
  trigger,
  devoirId,
  onStart,
  onPendingChange,
}: StartTimerDialogProps) {
  const [open, setOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetAndOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setCustomMinutes("");
    }
  }

  function start(mode: string, plannedMinutes?: number) {
    setError(null);
    onPendingChange?.(true);

    startTransition(async () => {
      const result = await onStart({ devoirId, mode, plannedMinutes });
      onPendingChange?.(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  const customValue = Number(customMinutes);
  const customValid =
    customMinutes.trim().length > 0 &&
    Number.isInteger(customValue) &&
    customValue > 0 &&
    customValue <= MAX_ESTIMATED_MINUTES;

  return (
    <Dialog open={open} onOpenChange={resetAndOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commencer ce devoir</DialogTitle>
          <DialogDescription>
            Chronomètre libre, ou minuteur pour te fixer une durée.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => start(TIMER_MODE_CHRONO)}
            className="h-11"
          >
            Chronométrer
          </Button>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Minuteur</span>
            <div className="flex flex-wrap gap-1.5">
              {MINUTEUR_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  disabled={isPending}
                  onClick={() => start(TIMER_MODE_MINUTEUR, minutes)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-muted px-3 text-sm text-foreground ring-1 ring-border disabled:opacity-60"
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={MAX_ESTIMATED_MINUTES}
                placeholder="Personnalisé (minutes)"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="h-11 text-base"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isPending || !customValid}
                onClick={() => start(TIMER_MODE_MINUTEUR, customValue)}
                className="h-11 shrink-0"
              >
                Démarrer
              </Button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-[44px]"
            onClick={() => setOpen(false)}
          >
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
