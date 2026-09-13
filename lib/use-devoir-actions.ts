"use client";

import { useState, useTransition } from "react";
import type {
  DeleteDevoirAction,
  DevoirView,
  ToggleDevoirDoneAction,
} from "@/components/homework/devoirs-list";
import {
  DEVOIR_STATUS_DONE,
  DEVOIR_STATUS_TODO,
  type TaskViewCategory,
} from "@/domain/homework";

// Extrait de components/homework/devoirs-list.tsx (évolution CartableFlow,
// page "Mes tâches") -- la même logique de mise à jour optimiste
// (cocher/supprimer un devoir) est désormais partagée entre le bloc
// "Devoirs" de l'Accueil ET la nouvelle page "Mes tâches", plutôt que
// dupliquée. `visibleDevoirs` renvoie déjà `done`/`status` fusionnés avec
// l'état optimiste et les devoirs supprimés exclus -- l'appelant n'a jamais
// à connaître `doneById`/`statusById` lui-même. Démarrer/arrêter un minuteur
// (évolution CartableFlow, StartTimerDialog) ne passe PAS par ce hook -- pas
// de mise à jour optimiste pour ces deux actions, le composant se contente
// de la revalidation serveur (comme HomeworkFormDialog pour créer/modifier),
// suffisant vu qu'ouvrir un dialogue de choix implique déjà un temps
// d'interaction (contrairement à un simple tap).

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

function taskViewMapFrom(devoirs: readonly { id: string; taskView: TaskViewCategory }[]) {
  const map: Record<string, TaskViewCategory> = {};
  for (const devoir of devoirs) map[devoir.id] = devoir.taskView;
  return map;
}

export interface UseDevoirActionsResult {
  visibleDevoirs: DevoirView[];
  pendingIds: Set<string>;
  errorIds: Set<string>;
  handleToggle: (id: string) => void;
  handleDelete: (id: string) => void;
  setPending: (id: string, pending: boolean) => void;
}

export function useDevoirActions(
  devoirs: readonly DevoirView[],
  onToggle: ToggleDevoirDoneAction,
  onDelete: DeleteDevoirAction
): UseDevoirActionsResult {
  const [doneById, setDoneById] = useState<Record<string, boolean>>(() =>
    doneMapFrom(devoirs)
  );
  const [statusById, setStatusById] = useState<Record<string, DevoirView["status"]>>(
    () => statusMapFrom(devoirs)
  );
  // Fige `taskView` à sa première valeur vue pour chaque devoir, jamais
  // resynchronisée depuis les props ensuite -- contrairement à
  // `doneById`/`statusById` (retour utilisateur : un devoir qui vient d'être
  // coché "fait" doit rester affiché dans l'onglet "Mes tâches" où il était,
  // jamais sauter vers "Terminés" tant que la page n'a pas été rechargée).
  // Cette intention était déjà documentée dans MesTachesView mais jamais
  // appliquée : `revalidatePath` (déclenché par toggleDevoirDoneAction)
  // provoque un rafraîchissement automatique des props Next.js quasi
  // immédiat après l'action, qui renvoyait déjà `taskView` recalculé --
  // resynchroniser `taskViewById` comme les deux autres map le laissait
  // sauter d'onglet aussitôt (bug de revue, signalé par l'utilisateur : "la
  // tâche disparaît"). Un devoir jamais vu auparavant (nouvel id) reçoit
  // quand même sa vraie classification, à l'arrivée des nouvelles props.
  const [taskViewById, setTaskViewById] = useState<Record<string, TaskViewCategory>>(() =>
    taskViewMapFrom(devoirs)
  );
  // Resynchronise depuis les props à chaque nouvelle donnée serveur --
  // ajustement pendant le rendu (pattern React recommandé pour dériver un
  // état depuis des props qui changent), pas un `useEffect`.
  const [prevDevoirs, setPrevDevoirs] = useState(devoirs);
  if (devoirs !== prevDevoirs) {
    setPrevDevoirs(devoirs);
    setDoneById(doneMapFrom(devoirs));
    setStatusById(statusMapFrom(devoirs));
    setTaskViewById((prev) => {
      const next = { ...prev };
      for (const devoir of devoirs) {
        if (!(devoir.id in next)) {
          next[devoir.id] = devoir.taskView;
        }
      }
      return next;
    });
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
      taskView: taskViewById[devoir.id] ?? devoir.taskView,
    }));

  return {
    visibleDevoirs,
    pendingIds,
    errorIds,
    handleToggle,
    handleDelete,
    setPending,
  };
}
