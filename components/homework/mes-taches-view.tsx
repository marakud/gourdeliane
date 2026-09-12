"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  CalendarX2,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";
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
  StartDevoirAction,
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
  DEVOIR_STATUS_TODO,
  TASK_VIEW_DONE,
  TASK_VIEW_LATER,
  TASK_VIEW_OVERDUE,
  TASK_VIEW_THIS_WEEK,
  TASK_VIEW_TODAY,
  TASK_VIEW_TOMORROW,
  type TaskViewCategory,
} from "@/domain/homework";
import { cn } from "@/lib/utils";

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

const VIEWS: { id: TaskViewCategory; label: string; icon: LucideIcon }[] = [
  { id: TASK_VIEW_TODAY, label: "Aujourd'hui", icon: CalendarCheck },
  { id: TASK_VIEW_TOMORROW, label: "Demain", icon: CalendarClock },
  { id: TASK_VIEW_THIS_WEEK, label: "Cette semaine", icon: CalendarRange },
  { id: TASK_VIEW_LATER, label: "Plus tard", icon: Clock },
  { id: TASK_VIEW_OVERDUE, label: "En retard", icon: CalendarX2 },
  { id: TASK_VIEW_DONE, label: "Terminés", icon: CheckCircle2 },
];

const STATUS_FILTER_ALL = "ALL" as const;
type StatusFilter =
  | typeof STATUS_FILTER_ALL
  | typeof DEVOIR_STATUS_TODO
  | typeof DEVOIR_STATUS_IN_PROGRESS;

const SUBJECT_FILTER_ALL = "ALL" as const;

export interface MesTachesViewProps {
  devoirs: DevoirView[];
  subjects: HomeworkFormDialogSubject[];
  scheduleSlots?: HomeworkFormDialogSlot[];
  onToggle: ToggleDevoirDoneAction;
  onStart: StartDevoirAction;
  onDelete: DeleteDevoirAction;
}

export function MesTachesView({
  devoirs,
  subjects,
  scheduleSlots = [],
  onToggle,
  onStart,
  onDelete,
}: MesTachesViewProps) {
  const [activeView, setActiveView] = useState<TaskViewCategory>(TASK_VIEW_TODAY);
  const [subjectFilter, setSubjectFilter] = useState<string>(SUBJECT_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_FILTER_ALL);

  const {
    visibleDevoirs,
    pendingIds,
    errorIds,
    handleToggle,
    handleStart,
    handleDelete,
    setPending,
  } = useDevoirActions(devoirs, onToggle, onStart, onDelete);

  const isDoneView = activeView === TASK_VIEW_DONE;

  const filteredDevoirs = visibleDevoirs.filter((devoir) => {
    if (devoir.taskView !== activeView) return false;
    if (subjectFilter !== SUBJECT_FILTER_ALL && devoir.subject.id !== subjectFilter) {
      return false;
    }
    // Le filtre statut n'a de sens que dans les vues non-Terminés (dans
    // "Terminés", tout est déjà DONE par construction).
    if (!isDoneView && statusFilter !== STATUS_FILTER_ALL && devoir.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Vue des tâches"
        className="flex gap-1 overflow-x-auto rounded-2xl bg-card p-1 ring-1 ring-border"
      >
        {VIEWS.map((view) => {
          const isActive = view.id === activeView;
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveView(view.id)}
              className={cn(
                // Zone de tap >= 44px et texte >= 16px (plancher d'accessibilité).
                "flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-base font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {view.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Select value={subjectFilter} onValueChange={(value) => setSubjectFilter(value as string)}>
          <SelectTrigger aria-label="Filtrer par matière" className="h-11 flex-1 text-base">
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

        {!isDoneView && (
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger aria-label="Filtrer par statut" className="h-11 flex-1 text-base">
              <SelectValue>
                {(value: string | null) => {
                  if (value === DEVOIR_STATUS_TODO) return "À faire";
                  if (value === DEVOIR_STATUS_IN_PROGRESS) return "En cours";
                  return "Tous les statuts";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTER_ALL}>Tous les statuts</SelectItem>
              <SelectItem value={DEVOIR_STATUS_TODO}>À faire</SelectItem>
              <SelectItem value={DEVOIR_STATUS_IN_PROGRESS}>En cours</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredDevoirs.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          message={
            isDoneView
              ? "Rien de terminé pour l'instant."
              : "Rien ici pour le moment."
          }
          layout="inline"
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {filteredDevoirs.map((devoir) => (
            <DevoirRow
              key={devoir.id}
              devoir={devoir}
              pending={pendingIds.has(devoir.id)}
              hasError={errorIds.has(devoir.id)}
              onToggle={() => handleToggle(devoir.id)}
              onStart={() => handleStart(devoir.id)}
              onDelete={() => handleDelete(devoir.id)}
              onPendingChange={(pending) => setPending(devoir.id, pending)}
              subjects={subjects}
              scheduleSlots={scheduleSlots}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
