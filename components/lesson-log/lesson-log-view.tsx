"use client";

import { useState } from "react";
import { NotebookText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LessonLogEntry } from "@/components/lesson-log/lesson-log-entry";
import type { LessonLogFormDialogSubject } from "@/components/lesson-log/lesson-log-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useLessonLogActions,
  type DeleteLessonLogAction,
} from "@/lib/use-lesson-log-actions";
import {
  filterLessonLogsByPeriod,
  groupLessonLogsByDate,
  LESSON_LOG_PERIOD_ALL,
  LESSON_LOG_PERIOD_MONTH,
  LESSON_LOG_PERIOD_WEEK,
  type LessonLogPeriod,
  type LessonLogView as LessonLogViewModel,
} from "@/domain/lesson-log";
import { cn } from "@/lib/utils";

// Vue "Cahier de texte" (évolution CartableFlow, retour utilisateur) --
// filtres période + matière (même pattern que MesTachesView,
// components/homework/mes-taches-view.tsx), entrées groupées par date
// décroissante (relecture -- "le week-end on regarde ce qui a été fait
// durant la semaine").

const PERIODS: { id: LessonLogPeriod; label: string }[] = [
  { id: LESSON_LOG_PERIOD_WEEK, label: "Cette semaine" },
  { id: LESSON_LOG_PERIOD_MONTH, label: "Ce mois" },
  { id: LESSON_LOG_PERIOD_ALL, label: "Tout" },
];

const SUBJECT_FILTER_ALL = "ALL" as const;

export interface LessonLogViewProps {
  logs: LessonLogViewModel[];
  subjects: LessonLogFormDialogSubject[];
  todayIso: string;
  onDelete: DeleteLessonLogAction;
}

export function LessonLogView({ logs, subjects, todayIso, onDelete }: LessonLogViewProps) {
  const [period, setPeriod] = useState<LessonLogPeriod>(LESSON_LOG_PERIOD_WEEK);
  const [subjectFilter, setSubjectFilter] = useState<string>(SUBJECT_FILTER_ALL);

  const { visibleLogs, pendingIds, errorIds, handleDelete, setPending } =
    useLessonLogActions(logs, onDelete);

  const filteredLogs = filterLessonLogsByPeriod(visibleLogs, period, todayIso).filter(
    (log) => subjectFilter === SUBJECT_FILTER_ALL || log.subject.id === subjectFilter
  );
  const groups = groupLessonLogsByDate(filteredLogs);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Période"
        className="flex gap-1 overflow-x-auto rounded-2xl bg-card p-1 ring-1 ring-border"
      >
        {PERIODS.map((item) => {
          const isActive = item.id === period;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setPeriod(item.id)}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center justify-center rounded-xl px-3 text-base font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

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

      {groups.length === 0 ? (
        <EmptyState
          icon={NotebookText}
          message="Rien ici pour le moment."
          layout="inline"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.dateIso} className="flex flex-col gap-2">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground">
                {group.dateLabel}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.logs.map((log) => (
                  <LessonLogEntry
                    key={log.id}
                    log={log}
                    pending={pendingIds.has(log.id)}
                    hasError={errorIds.has(log.id)}
                    onDelete={() => handleDelete(log.id)}
                    onPendingChange={(pending) => setPending(log.id, pending)}
                    subjects={subjects}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
