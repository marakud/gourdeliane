"use client";

import { Check, Pencil, Play, Square, Trash2 } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import {
  HomeworkFormDialog,
  type HomeworkFormDialogSlot,
  type HomeworkFormDialogSubject,
} from "@/components/homework/homework-form-dialog";
import { StartTimerDialog } from "@/components/homework/start-timer-dialog";
import type {
  DevoirView,
  StartTimerAction,
  StopTimerAction,
} from "@/components/homework/devoirs-list";
import { formatEstimatedDuration, DEVOIR_STATUS_IN_PROGRESS } from "@/domain/homework";
import { cn } from "@/lib/utils";

// Ligne d'un devoir (cocher/commencer/modifier/supprimer) -- extraite de
// components/homework/devoirs-list.tsx (évolution CartableFlow, page "Mes
// tâches") pour rester visuellement identique entre le bloc "Devoirs" de
// l'Accueil et cette nouvelle page, jamais deux rendus divergents pour la
// même donnée.
//
// Retour utilisateur -- les métadonnées (durée/échéance/planification/statut)
// étaient auparavant une seule phrase avec des "·", trop dense pour rester
// lisible une fois les quatre présentes en même temps. Chacune occupe
// maintenant sa propre ligne (`InfoLine`) plutôt qu'un fil continu -- un
// premier essai avec des pastilles arrondies "whitespace-nowrap" débordait
// hors de la colonne (trop étroite sur mobile, coincée entre la case à
// cocher et les boutons d'action) et finissait sous les icônes, illisible
// (bug de revue) : un texte de longueur variable a besoin de pouvoir
// s'enrouler normalement, pas d'être forcé sur une seule ligne. Seul le
// statut ("En cours"/"Minuteur en cours"), toujours court, garde une
// pastille.

function daysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return "aujourd'hui";
  if (daysRemaining === 1) return "demain";
  if (daysRemaining === -1) return "hier";
  if (daysRemaining > 1) return `dans ${daysRemaining} jours`;
  return `il y a ${Math.abs(daysRemaining)} jours`;
}

function InfoLine({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>;
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
      {children}
    </span>
  );
}

export interface DevoirRowProps {
  devoir: DevoirView;
  pending: boolean;
  hasError: boolean;
  onToggle: () => void;
  onStartTimer: StartTimerAction;
  onStopTimer: StopTimerAction;
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
  onStartTimer,
  onStopTimer,
  onDelete,
  onPendingChange,
  subjects,
  scheduleSlots = [],
}: DevoirRowProps) {
  const checked = devoir.done;
  const inProgress = devoir.status === DEVOIR_STATUS_IN_PROGRESS && !checked;
  const hasActiveSession = devoir.activeSession !== null;
  const totalRealMinutes =
    devoir.totalRealSeconds > 0 ? Math.round(devoir.totalRealSeconds / 60) : null;

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
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className={cn(
                "truncate text-base",
                checked ? "text-muted-foreground line-through" : "text-foreground"
              )}
            >
              {devoir.description}
            </span>
            <span className="text-sm text-muted-foreground">{devoir.subject.name}</span>
            {devoir.estimatedMinutes !== null && (
              <InfoLine>Prévu : {formatEstimatedDuration(devoir.estimatedMinutes)}</InfoLine>
            )}
            {totalRealMinutes !== null && (
              <InfoLine>Réel : {formatEstimatedDuration(totalRealMinutes)}</InfoLine>
            )}
            {devoir.echeanceLabel && devoir.echeanceDaysRemaining !== null && (
              <InfoLine>
                Échéance : {devoir.echeanceLabel} (
                {daysRemainingLabel(devoir.echeanceDaysRemaining)})
              </InfoLine>
            )}
            {devoir.planLabel && devoir.planDaysRemaining !== null && (
              <InfoLine>
                Programmé : {devoir.planLabel}
                {devoir.planTime && <> à {devoir.planTime}</>} (
                {daysRemainingLabel(devoir.planDaysRemaining)})
              </InfoLine>
            )}
            {hasActiveSession && <StatusBadge>Minuteur en cours</StatusBadge>}
            {inProgress && !hasActiveSession && <StatusBadge>En cours</StatusBadge>}
          </div>
        </button>
        {!checked && !hasActiveSession && (
          <StartTimerDialog
            devoirId={devoir.id}
            onStart={onStartTimer}
            onPendingChange={onPendingChange}
            trigger={
              <button
                type="button"
                disabled={pending}
                aria-label={`Commencer ${devoir.description}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-primary disabled:opacity-60"
              >
                <Play aria-hidden="true" className="size-4" />
              </button>
            }
          />
        )}
        {!checked && hasActiveSession && (
          <button
            type="button"
            onClick={() => {
              onPendingChange(true);
              onStopTimer({ devoirId: devoir.id }).finally(() => onPendingChange(false));
            }}
            disabled={pending}
            aria-label={`Arrêter le minuteur de ${devoir.description}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-primary disabled:opacity-60"
          >
            <Square aria-hidden="true" className="size-4" />
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
            planDate: devoir.planDateIso ?? "",
            planTime: devoir.planTime ?? "",
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
