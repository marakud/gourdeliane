"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { ActionResult } from "@/actions/homework";
import { SubjectTag } from "@/components/schedule/subject-tag";
import {
  HomeworkFormDialog,
  type HomeworkFormDialogSlot,
  type HomeworkFormDialogSubject,
} from "@/components/homework/homework-form-dialog";
import { cn } from "@/lib/utils";

// Bloc "Devoirs" (Accueil, Story 2.4 -- retour utilisateur : contrairement à
// la première itération, un devoir coché reste affiché (coché), jamais
// retiré de la liste. Bascule bidirectionnelle et suppression explicite,
// même mécanique de mise à jour optimiste que `FixedChecklist`
// (components/checklist/fixed-checklist.tsx), avec un bouton supprimer
// séparé (icône, mirror `SlotRow` -- components/schedule/slot-row.tsx).

export interface DevoirView {
  id: string;
  description: string;
  done: boolean;
  aRendre: boolean;
  subject: { id: string; name: string; colorIndex: number };
  // Formatés côté serveur (app/(accueil)/page.tsx, AD-4) -- ce composant
  // n'a jamais à recalculer une date lui-même.
  echeanceLabel: string | null;
  daysRemaining: number | null;
  // ISO "yyyy-MM-dd" brute (retour utilisateur -- édition), à côté
  // d'`echeanceLabel` déjà formatée pour l'affichage.
  echeanceIso: string | null;
  // Placement dans un trou libre de l'EDT (retour utilisateur Story 2.4,
  // 2e itération) -- `weekday` déjà en libellé français (WEEKDAY_LABELS)
  // pour l'affichage ; `plannedRaw` porte le code Weekday brut ("MONDAY")
  // nécessaire pour réinitialiser le FreeTimePicker en édition.
  planned: { weekday: string; startTime: string } | null;
  plannedRaw: { weekday: string; startTime: string } | null;
}

export type ToggleDevoirDoneAction = (input: {
  id: string;
  done: boolean;
}) => Promise<ActionResult<null>>;

export type DeleteDevoirAction = (input: {
  id: string;
}) => Promise<ActionResult<null>>;

export interface DevoirsListProps {
  devoirs: DevoirView[];
  onToggle: ToggleDevoirDoneAction;
  onDelete: DeleteDevoirAction;
  // Nécessaires pour le formulaire d'édition (retour utilisateur) -- mêmes
  // données que celles déjà passées à AddHomeworkFab.
  subjects: HomeworkFormDialogSubject[];
  scheduleSlots?: HomeworkFormDialogSlot[];
}

function daysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return "aujourd'hui";
  if (daysRemaining === 1) return "demain";
  if (daysRemaining === -1) return "hier";
  if (daysRemaining > 1) return `dans ${daysRemaining} jours`;
  return `il y a ${Math.abs(daysRemaining)} jours`;
}

function doneMapFrom(devoirs: readonly { id: string; done: boolean }[]) {
  const map: Record<string, boolean> = {};
  for (const devoir of devoirs) map[devoir.id] = devoir.done;
  return map;
}

export function DevoirsList({
  devoirs,
  onToggle,
  onDelete,
  subjects,
  scheduleSlots = [],
}: DevoirsListProps) {
  // État coché en cours d'édition optimiste -- clé par id, initialisé depuis
  // les props puis mis à jour localement au tap, avant la réponse serveur.
  const [doneById, setDoneById] = useState<Record<string, boolean>>(() =>
    doneMapFrom(devoirs)
  );
  // Reseynchronise depuis les props à chaque nouvelle donnée serveur (ex.
  // après une revalidation déclenchée ailleurs) -- sans ceci, une valeur
  // optimiste locale pourrait diverger indéfiniment de l'état réel une fois
  // le composant monté (la bascule est désormais bidirectionnelle,
  // contrairement à la première itération où un devoir coché disparaissait
  // du rendu et ne posait donc jamais cette question). Ajustement pendant le
  // rendu plutôt qu'un `useEffect` (pattern React recommandé pour dériver un
  // état depuis des props qui changent -- évite un aller-retour de rendu
  // supplémentaire).
  const [prevDevoirs, setPrevDevoirs] = useState(devoirs);
  if (devoirs !== prevDevoirs) {
    setPrevDevoirs(devoirs);
    setDoneById(doneMapFrom(devoirs));
  }
  // Ids supprimés optimistiquement -- masqués du rendu même si la réponse
  // serveur n'est pas encore revenue.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(() => new Set());
  // ids en cours d'enregistrement -- empêche un double-tap concurrent sur la
  // même ligne pendant l'aller-retour serveur, par ligne (Set, pas un seul
  // id) : plusieurs lignes peuvent désormais être éditées en parallèle
  // puisqu'aucune ne disparaît plus du rendu au tap.
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
    clearError(id);
    setPending(id, true);
    setDoneById((prev) => ({ ...prev, [id]: next }));

    startTransition(async () => {
      const result = await onToggle({ id, done: next });
      if (!result.ok) {
        setDoneById((prev) => ({ ...prev, [id]: !next }));
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

  const visibleDevoirs = devoirs.filter((devoir) => !deletedIds.has(devoir.id));
  const doneCount = visibleDevoirs.filter((devoir) => doneById[devoir.id]).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Devoirs à faire
        </h3>
        {visibleDevoirs.length > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {doneCount}/{visibleDevoirs.length}
          </span>
        )}
      </div>

      {visibleDevoirs.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Rien à faire ce soir, bravo !
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visibleDevoirs.map((devoir) => {
            const checked = doneById[devoir.id] ?? devoir.done;
            return (
              <li key={devoir.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(devoir.id)}
                    aria-pressed={checked}
                    disabled={pendingIds.has(devoir.id)}
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
                      {checked && (
                        <Check className="size-4 text-success-foreground" />
                      )}
                    </span>
                    <SubjectTag
                      name={devoir.subject.name}
                      colorIndex={devoir.subject.colorIndex}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          "truncate text-base",
                          checked
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        )}
                      >
                        {devoir.description}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {devoir.subject.name}
                        {devoir.echeanceLabel && devoir.daysRemaining !== null && (
                          <> · Échéance : {devoir.echeanceLabel} ({daysRemainingLabel(devoir.daysRemaining)})</>
                        )}
                        {devoir.planned && (
                          <>
                            {" "}
                            · {devoir.planned.weekday} {devoir.planned.startTime}
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                  <HomeworkFormDialog
                    trigger={
                      <button
                        type="button"
                        disabled={pendingIds.has(devoir.id)}
                        aria-label={`Modifier ${devoir.description}`}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground disabled:opacity-60"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>
                    }
                    subjects={subjects}
                    scheduleSlots={scheduleSlots}
                    onPendingChange={(pending) => setPending(devoir.id, pending)}
                    devoir={{
                      id: devoir.id,
                      subjectId: devoir.subject.id,
                      description: devoir.description,
                      aRendre: devoir.aRendre,
                      echeance: devoir.echeanceIso ?? "",
                      plannedWeekday: devoir.plannedRaw?.weekday ?? "",
                      plannedStartTime: devoir.plannedRaw?.startTime ?? "",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(devoir.id)}
                    disabled={pendingIds.has(devoir.id)}
                    aria-label={`Supprimer ${devoir.description}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-destructive disabled:opacity-60"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
                {errorIds.has(devoir.id) && (
                  <p
                    role="alert"
                    className="pl-1 text-sm font-medium text-destructive"
                  >
                    Impossible d&apos;enregistrer. Réessaie.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
