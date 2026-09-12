"use client";

import { useState, useTransition } from "react";
import type {
  DeleteDevoirAction,
  DevoirView,
  StartDevoirAction,
  ToggleDevoirDoneAction,
} from "@/components/homework/devoirs-list";
import {
  DEVOIR_STATUS_DONE,
  DEVOIR_STATUS_IN_PROGRESS,
  DEVOIR_STATUS_TODO,
} from "@/domain/homework";

// Extrait de components/homework/devoirs-list.tsx (évolution CartableFlow,
// page "Mes tâches") -- la même logique de mise à jour optimiste
// (cocher/commencer/supprimer un devoir) est désormais partagée entre le
// bloc "Devoirs" de l'Accueil ET la nouvelle page "Mes tâches", plutôt que
// dupliquée. `visibleDevoirs` renvoie déjà `done`/`status` fusionnés avec
// l'état optimiste et les devoirs supprimés exclus -- l'appelant n'a jamais
// à connaître `doneById`/`statusById` lui-même.

function doneMapFrom(devoirs: readonly { id: string; done: boolean }[]) {
  const map: Record<string, boolean> = {};
  for (const devoir of devoirs) map[devoir.id] = devoir.done;
  return map;
}

function statusMapFrom(
  devoirs: readonly { id: string; status: DevoirView["status"] }[]
) {
  const map: Record<string, DevoirView["status"]> = {};
  for (const devoir of devoirs) map[devoir.id] = devoir.status;
  return map;
}

export interface UseDevoirActionsResult {
  visibleDevoirs: DevoirView[];
  pendingIds: Set<string>;
  errorIds: Set<string>;
  handleToggle: (id: string) => void;
  handleStart: (id: string) => void;
  handleDelete: (id: string) => void;
  setPending: (id: string, pending: boolean) => void;
}

export function useDevoirActions(
  devoirs: readonly DevoirView[],
  onToggle: ToggleDevoirDoneAction,
  onStart: StartDevoirAction,
  onDelete: DeleteDevoirAction
): UseDevoirActionsResult {
  const [doneById, setDoneById] = useState<Record<string, boolean>>(() =>
    doneMapFrom(devoirs)
  );
  const [statusById, setStatusById] = useState<Record<string, DevoirView["status"]>>(
    () => statusMapFrom(devoirs)
  );
  // Resynchronise depuis les props à chaque nouvelle donnée serveur --
  // ajustement pendant le rendu (pattern React recommandé pour dériver un
  // état depuis des props qui changent), pas un `useEffect`.
  const [prevDevoirs, setPrevDevoirs] = useState(devoirs);
  if (devoirs !== prevDevoirs) {
    setPrevDevoirs(devoirs);
    setDoneById(doneMapFrom(devoirs));
    setStatusById(statusMapFrom(devoirs));
  }
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

  function handleToggle(id: string) {
    if (pendingIds.has(id)) return;

    const next = !doneById[id];
    const prevStatus = statusById[id];
    clearError(id);
    setPending(id, true);
    setDoneById((prev) => ({ ...prev, [id]: next }));
    // `status` reste synchronisé avec `done` (même règle que
    // data/homework.ts::toggleDevoirDone -- coché -> DONE, décoché -> TODO).
    setStatusById((prev) => ({
      ...prev,
      [id]: next ? DEVOIR_STATUS_DONE : DEVOIR_STATUS_TODO,
    }));

    startTransition(async () => {
      const result = await onToggle({ id, done: next });
      if (!result.ok) {
        setDoneById((prev) => ({ ...prev, [id]: !next }));
        setStatusById((prev) => ({ ...prev, [id]: prevStatus }));
        addError(id);
      }
      setPending(id, false);
    });
  }

  function handleStart(id: string) {
    if (pendingIds.has(id)) return;
    if (statusById[id] !== DEVOIR_STATUS_TODO) return;

    clearError(id);
    setPending(id, true);
    setStatusById((prev) => ({ ...prev, [id]: DEVOIR_STATUS_IN_PROGRESS }));

    startTransition(async () => {
      const result = await onStart({ id });
      if (!result.ok) {
        setStatusById((prev) => ({ ...prev, [id]: DEVOIR_STATUS_TODO }));
        addError(id);
      }
      setPending(id, false);
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

  const visibleDevoirs = devoirs
    .filter((devoir) => !deletedIds.has(devoir.id))
    .map((devoir) => ({
      ...devoir,
      done: doneById[devoir.id] ?? devoir.done,
      status: statusById[devoir.id] ?? devoir.status,
    }));

  return {
    visibleDevoirs,
    pendingIds,
    errorIds,
    handleToggle,
    handleStart,
    handleDelete,
    setPending,
  };
}
