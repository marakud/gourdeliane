"use client";

import { Pencil, Trash2 } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import {
  LessonLogFormDialog,
  type LessonLogFormDialogSubject,
} from "@/components/lesson-log/lesson-log-form-dialog";
import type { LessonLogView } from "@/domain/lesson-log";
import { cn } from "@/lib/utils";

// Une entrée du cahier de texte -- carte (pas une ligne de checklist, cf.
// components/homework/devoir-row.tsx) car son contenu principal est un texte
// libre potentiellement long (plusieurs phrases), pas un simple libellé
// coché/décoché.

export interface LessonLogEntryProps {
  log: LessonLogView;
  pending: boolean;
  hasError: boolean;
  onDelete: () => void;
  onPendingChange: (pending: boolean) => void;
  subjects: LessonLogFormDialogSubject[];
}

export function LessonLogEntry({
  log,
  pending,
  hasError,
  onDelete,
  onPendingChange,
  subjects,
}: LessonLogEntryProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-1.5 rounded-2xl bg-card p-3 ring-1 ring-border transition-opacity",
        pending && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <SubjectTag name={log.subject.name} colorIndex={log.subject.colorIndex} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{log.subject.name}</span>
          <p className="whitespace-pre-wrap text-base text-foreground">{log.content}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <LessonLogFormDialog
            trigger={
              <button
                type="button"
                disabled={pending}
                aria-label={`Modifier l'entrée du ${log.dateLabel} en ${log.subject.name}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground disabled:opacity-60"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </button>
            }
            subjects={subjects}
            defaultDateIso={log.dateIso}
            onPendingChange={onPendingChange}
            entry={{
              id: log.id,
              subjectId: log.subject.id,
              date: log.dateIso,
              content: log.content,
            }}
          />
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label={`Supprimer l'entrée du ${log.dateLabel} en ${log.subject.name}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-destructive disabled:opacity-60"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      {hasError && (
        <p role="alert" className="pl-1 text-sm font-medium text-destructive">
          Impossible d&apos;enregistrer. Réessaie.
        </p>
      )}
    </li>
  );
}
