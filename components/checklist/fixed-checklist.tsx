"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleMatinChecklistItem } from "@/actions/checklist";
import { cn } from "@/lib/utils";

// Bloc "Ce matin" (Accueil, Story 2.2). Reçoit la checklist déjà dérivée par
// domain/checklist.ts::deriveFixedChecklist -- liste plate (pas de
// groupement par matière, contrairement au sac, cf. Never de la spec 2.2).
// Même mécanique de mise à jour optimiste que SacChecklist
// (components/checklist/sac-checklist.tsx), via `toggleMatinChecklistItem`
// (actions/checklist.ts) plutôt que `toggleChecklistItem` directement.

export interface FixedChecklistItemView {
  sourceId: string;
  label: string;
  checked: boolean;
}

export interface FixedChecklistProps {
  title: string;
  items: FixedChecklistItemView[];
  // Jour pour lequel la checklist est préparée ("aujourd'hui" pour Matin,
  // AD-4) -- transmis tel quel à la Server Action (déjà calculé côté serveur
  // par app/(accueil)/page.tsx, jamais recalculé ici).
  dateIso: string;
}

export function FixedChecklist({ title, items, dateIso }: FixedChecklistProps) {
  const [checkedById, setCheckedById] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const item of items) {
        initial[item.sourceId] = item.checked;
      }
      return initial;
    }
  );
  const [errorId, setErrorId] = useState<string | null>(null);
  // sourceId en cours d'enregistrement -- désactive uniquement CET item
  // pendant l'aller-retour serveur, empêche un double-tap concurrent.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(sourceId: string) {
    if (pendingId === sourceId) return;

    const next = !checkedById[sourceId];
    setErrorId(null);
    setPendingId(sourceId);
    setCheckedById((prev) => ({ ...prev, [sourceId]: next }));

    startTransition(async () => {
      const result = await toggleMatinChecklistItem({
        date: dateIso,
        sourceId,
        checked: next,
      });
      if (!result.ok) {
        // Annule la mise à jour optimiste -- l'état affiché doit toujours
        // refléter ce qui est réellement enregistré.
        setCheckedById((prev) => ({ ...prev, [sourceId]: !next }));
        setErrorId(sourceId);
      }
      setPendingId(null);
    });
  }

  const total = items.length;
  const done = items.filter((item) => checkedById[item.sourceId]).length;

  return (
    <section
      aria-labelledby="matin-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="matin-heading"
          className="font-heading text-lg font-semibold text-foreground"
        >
          {title}
        </h2>
        {total > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {done}/{total}
          </span>
        )}
      </div>

      {total === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun item dans cette liste -- ajoutes-en depuis Réglages.
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const checked = checkedById[item.sourceId] ?? item.checked;
          return (
            <li key={item.sourceId}>
              <button
                type="button"
                onClick={() => handleToggle(item.sourceId)}
                aria-pressed={checked}
                disabled={pendingId === item.sourceId}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-muted px-3 py-2 text-left disabled:opacity-60"
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
                <span
                  className={cn(
                    "text-base",
                    checked
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
              {errorId === item.sourceId && (
                <p
                  role="alert"
                  className="pt-1 pl-9 text-sm font-medium text-destructive"
                >
                  Impossible d&apos;enregistrer. Réessaie.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
