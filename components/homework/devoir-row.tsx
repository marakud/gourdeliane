"use client";

import { Check, Pencil, Play, Trash2 } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import {
  HomeworkFormDialog,
  type HomeworkFormDialogSlot,
  type HomeworkFormDialogSubject,
} from "@/components/homework/homework-form-dialog";
import type { DevoirView } from "@/components/homework/devoirs-list";
import {
  formatEstimatedDuration,
  DEVOIR_STATUS_IN_PROGRESS,
  DEVOIR_STATUS_TODO,
} from "@/domain/homework";
import { cn } from "@/lib/utils";

// Ligne d'un devoir (cocher/commencer/modifier/supprimer) -- extraite de
// components/homework/devoirs-list.tsx (évolution CartableFlow, page "Mes
// tâches") pour rester visuellement identique entre le bloc "Devoirs" de
// l'Accueil et cette nouvelle page, jamais deux rendus divergents pour la
// même donnée.

function daysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return "aujourd'hui";
  if (daysRemaining === 1) return "demain";
  if (daysRemaining === -1) return "hier";
  if (daysRemaining > 1) return `dans ${daysRemaining} jours`;
  return `il y a ${Math.abs(daysRemaining)} jours`;
}

export interface DevoirRowProps {
  devoir: DevoirView;
  pending: boolean;
  hasError: boolean;
  onToggle: () => void;
  onStart: () => void;
  onDelete: () => void;
  onPendingChange: (pending: boolean) => void;
  subjects: HomeworkFormDialogSubject[];
  scheduleSlots?: HomeworkFormDialogSlot[];
}

export function DevoirRow({
  devoir,
  pending,
  hasError,
  onToggle,
  onStart,
  onDelete,
  onPendingChange,
  subjects,
  scheduleSlots = [],
}: DevoirRowProps) {
  const checked = devoir.done;
  const inProgress = devoir.status === DEVOIR_STATUS_IN_PROGRESS && !checked;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={checked}
          disabled={pending}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted px-3 py-2 text-left disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full ring-2 transition-colors",
              checked
                ? "bg-success ring-success"
                : "bg-transparent ring-neutral-pending"
            )}
          >
            {checked && <Check className="size-4 text-success-foreground" />}
          </span>
          <SubjectTag name={devoir.subject.name} colorIndex={devoir.subject.colorIndex} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                "truncate text-base",
                checked ? "text-muted-foreground line-through" : "text-foreground"
              )}
            >
              {devoir.description}
            </span>
            <span className="text-sm text-muted-foreground">
              {devoir.subject.name}
              {devoir.estimatedMinutes !== null && (
                <> · Prévu : {formatEstimatedDuration(devoir.estimatedMinutes)}</>
              )}
              {devoir.echeanceLabel && devoir.daysRemaining !== null && (
                <> · Échéance : {devoir.echeanceLabel} ({daysRemainingLabel(devoir.daysRemaining)})</>
              )}
              {devoir.planned && (
                <>
                  {" "}
                  · {devoir.planned.weekday} {devoir.planned.startTime}
                </>
              )}
              {inProgress && (
                <>
                  {" "}
                  · <span className="font-semibold text-primary">En cours</span>
                </>
              )}
            </span>
          </div>
        </button>
        {!checked && devoir.status === DEVOIR_STATUS_TODO && (
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            aria-label={`Commencer ${devoir.description}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-primary disabled:opacity-60"
          >
            <Play aria-hidden="true" className="size-4" />
          </button>
        )}
        <HomeworkFormDialog
          trigger={
            <button
              type="button"
              disabled={pending}
              aria-label={`Modifier ${devoir.description}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground disabled:opacity-60"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
          }
          subjects={subjects}
          scheduleSlots={scheduleSlots}
          onPendingChange={onPendingChange}
          devoir={{
            id: devoir.id,
            subjectId: devoir.subject.id,
            description: devoir.description,
            aRendre: devoir.aRendre,
            echeance: devoir.echeanceIso ?? "",
            plannedWeekday: devoir.plannedRaw?.weekday ?? "",
            plannedStartTime: devoir.plannedRaw?.startTime ?? "",
            estimatedMinutes: devoir.estimatedMinutes,
          }}
        />
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`Supprimer ${devoir.description}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-destructive disabled:opacity-60"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      {hasError && (
        <p role="alert" className="pl-1 text-sm font-medium text-destructive">
          Impossible d&apos;enregistrer. Réessaie.
        </p>
      )}
    </li>
  );
}
