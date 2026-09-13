"use client";

import { useState, useTransition } from "react";
import type { LessonLogView } from "@/domain/lesson-log";
import type { ActionResult } from "@/actions/lesson-log";

// Même pattern exact que lib/use-devoir-actions.ts, réduit à la seule
// mutation optimiste dont le cahier de texte a besoin : la suppression
// (l'édition passe par LessonLogFormDialog, qui gère son propre `isPending`
// et ferme/rafraîchit via `revalidatePath` -- pas d'état optimiste
// supplémentaire à maintenir ici pour elle).

export type DeleteLessonLogAction = (input: {
  id: string;
}) => Promise<ActionResult<null>>;

export interface UseLessonLogActionsResult {
  visibleLogs: LessonLogView[];
  pendingIds: Set<string>;
  errorIds: Set<string>;
  handleDelete: (id: string) => void;
  setPending: (id: string, pending: boolean) => void;
}

export function useLessonLogActions(
  logs: readonly LessonLogView[],
  onDelete: DeleteLessonLogAction
): UseLessonLogActionsResult {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(() => new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  function clearError(id: string) {
    setErrorIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function addError(id: string) {
    setErrorIds((prev) => new Set(prev).add(id));
  }

  function setPending(id: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleDelete(id: string) {
    if (pendingIds.has(id)) return;

    clearError(id);
    setPending(id, true);
    setDeletedIds((prev) => new Set(prev).add(id));

    startTransition(async () => {
      const result = await onDelete({ id });
      if (!result.ok) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        addError(id);
      }
      setPending(id, false);
    });
  }

  const visibleLogs = logs.filter((log) => !deletedIds.has(log.id));

  return { visibleLogs, pendingIds, errorIds, handleDelete, setPending };
}
