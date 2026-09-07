"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/actions/homework";
import { SubjectTag } from "@/components/schedule/subject-tag";

// Bloc "Devoirs à faire" (Accueil, Story 2.4) -- toujours affiché, y compris
// vide (Boundaries : "jamais absent, contrairement à Sac"). Mécanique de
// mise à jour optimiste inspirée de `FixedChecklist`
// (components/checklist/fixed-checklist.tsx), avec une différence de forme :
// un devoir coché n'affiche pas un état "coché" en place, il disparaît de la
// liste (I/O matrix spec 2.4 -- "ligne retirée de 'à faire'"), puisque cette
// liste ne reçoit jamais que des devoirs `done === false`
// (domain/homework.ts::filterDevoirsAFaire, appliqué par l'appelant).

export interface DevoirView {
  id: string;
  description: string;
  subject: { id: string; name: string; colorIndex: number };
}

export type ToggleDevoirDoneAction = (input: {
  id: string;
}) => Promise<ActionResult<null>>;

export interface DevoirsListProps {
  devoirs: DevoirView[];
  onComplete: ToggleDevoirDoneAction;
}

export function DevoirsList({ devoirs, onComplete }: DevoirsListProps) {
  // Ids retirés optimistiquement de "à faire" dès le tap -- avant même la
  // réponse serveur (I/O matrix : "mise à jour optimiste"). Un id présent
  // ici est masqué du rendu, qu'il ait réellement réussi ou non.
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [errorId, setErrorId] = useState<string | null>(null);
  // id en cours d'enregistrement -- empêche un double-tap concurrent sur la
  // même ligne pendant l'aller-retour serveur.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleComplete(id: string) {
    if (pendingId === id) return;

    setErrorId(null);
    setPendingId(id);
    setCompletedIds((prev) => new Set(prev).add(id));

    startTransition(async () => {
      const result = await onComplete({ id });
      if (!result.ok) {
        // Échec réseau -> annule l'optimisme, réaffiche la ligne (I/O matrix).
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setErrorId(id);
      }
      setPendingId(null);
    });
  }

  const visibleDevoirs = devoirs.filter((devoir) => !completedIds.has(devoir.id));

  return (
    <section
      aria-labelledby="devoirs-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="devoirs-heading"
          className="font-heading text-lg font-semibold text-foreground"
        >
          Devoirs à faire
        </h2>
        {visibleDevoirs.length > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {visibleDevoirs.length}
          </span>
        )}
      </div>

      {visibleDevoirs.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Rien à faire ce soir, bravo !
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visibleDevoirs.map((devoir) => (
            <li key={devoir.id}>
              <button
                type="button"
                onClick={() => handleComplete(devoir.id)}
                disabled={pendingId === devoir.id}
                aria-label={`Marquer fait : ${devoir.description}`}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-muted px-3 py-2 text-left disabled:opacity-60"
              >
                <SubjectTag
                  name={devoir.subject.name}
                  colorIndex={devoir.subject.colorIndex}
                />
                <span className="flex-1 text-base text-foreground">
                  {devoir.description}
                </span>
                <span
                  aria-hidden="true"
                  className="size-6 shrink-0 rounded-full ring-2 ring-neutral-pending"
                />
              </button>
              {errorId === devoir.id && (
                <p
                  role="alert"
                  className="pt-1 pl-1 text-sm font-medium text-destructive"
                >
                  Impossible d&apos;enregistrer. Réessaie.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
