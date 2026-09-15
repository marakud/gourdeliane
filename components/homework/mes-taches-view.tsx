"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DevoirRow } from "@/components/homework/devoir-row";
import type {
  DeleteDevoirAction,
  DevoirView,
  StartTimerAction,
  StopTimerAction,
  ToggleDevoirDoneAction,
} from "@/components/homework/devoirs-list";
import type {
  HomeworkFormDialogSlot,
  HomeworkFormDialogSubject,
} from "@/components/homework/homework-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useDevoirActions } from "@/lib/use-devoir-actions";
import {
  DEVOIR_STATUS_IN_PROGRESS,
  DEVOIR_STATUS_DONE,
  DEVOIR_STATUS_TODO,
  formatDateLabel,
  getEffectiveTaskDateIso,
  sortTasksByEffectiveDate,
  taskMatchesPeriod,
  TASK_PERIOD_ALL,
  TASK_PERIOD_NEXT_WEEK,
  TASK_PERIOD_THIS_MONTH,
  TASK_PERIOD_THIS_WEEK,
  TASK_PERIOD_TODAY,
  TASK_PERIOD_TOMORROW,
  type TaskPeriodFilter,
} from "@/domain/homework";

// Page "Mes tâches" (évolution CartableFlow, étape 3) -- regroupe TOUS les
// devoirs (Accueil n'en montre qu'un sous-ensemble, "Ce soir") derrière 6
// vues + filtres matière/statut. Réutilise `useDevoirActions`/`DevoirRow`
// (components/homework/devoir-row.tsx, lib/use-devoir-actions.ts) -- même
// mécanique de mise à jour optimiste que le bloc "Devoirs" de l'Accueil,
// jamais un second calcul divergent.
//
// `devoir.taskView` (classifyTaskView, calculé côté serveur à partir de
// `done`/`daysRemaining`) n'est jamais recalculé ici après une bascule
// optimiste -- un devoir qui vient d'être coché "fait" reste affiché dans
// l'onglet où il était (ne saute pas immédiatement vers "Terminés"), ce qui
// évite qu'une tâche disparaisse brusquement de l'écran pendant qu'on la
// coche. La vraie classification revient au prochain chargement de la page
// (revalidatePath("/mes-taches"), actions/homework.ts).

const STATUS_FILTER_ALL = "ALL" as const;
type StatusFilter =
  | typeof STATUS_FILTER_ALL
  | typeof DEVOIR_STATUS_TODO
  | typeof DEVOIR_STATUS_IN_PROGRESS
  | typeof DEVOIR_STATUS_DONE;

const SUBJECT_FILTER_ALL = "ALL" as const;

export interface MesTachesViewProps {
  devoirs: DevoirView[];
  subjects: HomeworkFormDialogSubject[];
  scheduleSlots?: HomeworkFormDialogSlot[];
  onToggle: ToggleDevoirDoneAction;
  onStartTimer: StartTimerAction;
  onStopTimer: StopTimerAction;
  onDelete: DeleteDevoirAction;
  todayIso: string;
}

export function MesTachesView({
  devoirs,
  subjects,
  scheduleSlots = [],
  onToggle,
  onStartTimer,
  onStopTimer,
  onDelete,
  todayIso,
}: MesTachesViewProps) {
  const [periodFilter, setPeriodFilter] = useState<TaskPeriodFilter>(TASK_PERIOD_ALL);
  const [subjectFilter, setSubjectFilter] = useState<string>(SUBJECT_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_FILTER_ALL);

  const { visibleDevoirs, pendingIds, errorIds, handleToggle, handleDelete, setPending } =
    useDevoirActions(devoirs, onToggle, onDelete);

  const filteredDevoirs = sortTasksByEffectiveDate(visibleDevoirs.filter((devoir) => {
    if (!taskMatchesPeriod(devoir, periodFilter, todayIso)) return false;
    if (subjectFilter !== SUBJECT_FILTER_ALL && devoir.subject.id !== subjectFilter) {
      return false;
    }
    if (statusFilter !== STATUS_FILTER_ALL && devoir.status !== statusFilter) {
      return false;
    }
    return true;
  }));

  const groups = filteredDevoirs.reduce<
    { dateIso: string | null; devoirs: DevoirView[] }[]
  >((result, devoir) => {
    const dateIso = getEffectiveTaskDateIso(devoir);
    const last = result.at(-1);
    if (last?.dateIso === dateIso) last.devoirs.push(devoir);
    else result.push({ dateIso, devoirs: [devoir] });
    return result;
  }, []);

  function dateHeading(dateIso: string | null): string {
    if (!dateIso) return "Sans date";
    if (dateIso === todayIso) return `Aujourd'hui · ${formatDateLabel(dateIso)}`;
    const tomorrow = new Date(`${todayIso}T00:00:00.000Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (dateIso === tomorrow.toISOString().slice(0, 10)) {
      return `Demain · ${formatDateLabel(dateIso)}`;
    }
    return formatDateLabel(dateIso);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as TaskPeriodFilter)}>
          <SelectTrigger aria-label="Filtrer par période" className="h-11 w-full text-base">
            <SelectValue>
              {(value: string | null) => {
                if (value === TASK_PERIOD_TODAY) return "Aujourd'hui";
                if (value === TASK_PERIOD_TOMORROW) return "Demain";
                if (value === TASK_PERIOD_THIS_WEEK) return "Cette semaine";
                if (value === TASK_PERIOD_NEXT_WEEK) return "Semaine prochaine";
                if (value === TASK_PERIOD_THIS_MONTH) return "Ce mois-ci";
                return "Toutes les dates";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TASK_PERIOD_ALL}>Toutes les dates</SelectItem>
            <SelectItem value={TASK_PERIOD_TODAY}>Aujourd&apos;hui</SelectItem>
            <SelectItem value={TASK_PERIOD_TOMORROW}>Demain</SelectItem>
            <SelectItem value={TASK_PERIOD_THIS_WEEK}>Cette semaine</SelectItem>
            <SelectItem value={TASK_PERIOD_NEXT_WEEK}>Semaine prochaine</SelectItem>
            <SelectItem value={TASK_PERIOD_THIS_MONTH}>Ce mois-ci</SelectItem>
          </SelectContent>
        </Select>

        <Select value={subjectFilter} onValueChange={(value) => setSubjectFilter(value as string)}>
          <SelectTrigger aria-label="Filtrer par matière" className="h-11 w-full text-base">
            <SelectValue>
              {(value: string | null) =>
                subjects.find((subject) => subject.id === value)?.name ??
                "Toutes les matières"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SUBJECT_FILTER_ALL}>Toutes les matières</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
            <SelectTrigger aria-label="Filtrer par statut" className="h-11 w-full text-base">
              <SelectValue>
                {(value: string | null) => {
                  if (value === DEVOIR_STATUS_TODO) return "À faire";
                  if (value === DEVOIR_STATUS_IN_PROGRESS) return "En cours";
                  if (value === DEVOIR_STATUS_DONE) return "Terminés";
                  return "Tous les statuts";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTER_ALL}>Tous les statuts</SelectItem>
              <SelectItem value={DEVOIR_STATUS_TODO}>À faire</SelectItem>
              <SelectItem value={DEVOIR_STATUS_IN_PROGRESS}>En cours</SelectItem>
              <SelectItem value={DEVOIR_STATUS_DONE}>Terminés</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {filteredDevoirs.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          message="Aucune tâche ne correspond à ces filtres."
          layout="inline"
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.dateIso ?? "undated"} className="flex flex-col gap-2">
              <h2 className="font-heading text-base font-semibold text-foreground">
                {dateHeading(group.dateIso)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">({group.devoirs.length})</span>
              </h2>
              <ul className="flex flex-col gap-1.5">
                {group.devoirs.map((devoir) => (
                  <DevoirRow
                    key={devoir.id}
                    devoir={devoir}
                    pending={pendingIds.has(devoir.id)}
                    hasError={errorIds.has(devoir.id)}
                    onToggle={() => handleToggle(devoir.id)}
                    onStartTimer={onStartTimer}
                    onStopTimer={onStopTimer}
                    onDelete={() => handleDelete(devoir.id)}
                    onPendingChange={(pending) => setPending(devoir.id, pending)}
                    subjects={subjects}
                    scheduleSlots={scheduleSlots}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
