"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import type { ActionResult, ToggleChecklistItemInput } from "@/actions/checklist";
import { SubjectTag } from "@/components/schedule/subject-tag";
import { useJustToggled } from "@/lib/use-just-toggled";
import { cn } from "@/lib/utils";

// Bloc "Révisions du jour" (Accueil, Story 2.6, FR-19) : reçoit la checklist
// déjà dérivée par domain/checklist.ts::deriveRevisionsChecklist -- ce
// composant ne recalcule rien. Même mécanisme d'optimistic update que
// FixedChecklist (Matin/Retour), mais liste plate DE MATIÈRES (donc, à
// l'inverse de FixedChecklist, une pastille de matière par ligne, comme
// dans SacChecklist). Ne rend RIEN (pas de carte, pas de message) quand
// `items` est vide (Boundaries spec 2.6 : contrairement au Sac, aucun
// message neutre pour ce bloc -- l'appelant décide déjà de ne pas monter ce
// composant sur un jour sans cours, ce garde-fou est une seconde ligne de
// défense).

export interface RevisionsChecklistItemView {
  sourceId: string;
  sourceType: string;
  label: string;
  checked: boolean;
  subject: { id: string; name: string; colorIndex: number };
}

export type ToggleRevisionsChecklistItemAction = (
  input: Omit<ToggleChecklistItemInput, "checklistType" | "sourceType">
) => Promise<ActionResult<null>>;

export interface RevisionsChecklistProps {
  items: RevisionsChecklistItemView[];
  dateIso: string;
  onToggle: ToggleRevisionsChecklistItemAction;
}

export function RevisionsChecklist({
  items,
  dateIso,
  onToggle,
}: RevisionsChecklistProps) {
  const [checkedById, setCheckedById] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const item of items) initial[item.sourceId] = item.checked;
      return initial;
    }
  );
  const [errorId, setErrorId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Refonte visuelle -- clé dont la coche vient d'être animée (pop + flash
  // de couleur bref sur la ligne), même hook que FixedChecklist/
  // SacChecklist (`lib/use-just-toggled.ts`).
  const { justToggledKey, markJustToggled } = useJustToggled();
  const [, startTransition] = useTransition();

  if (items.length === 0) {
    return null;
  }

  function handleToggle(sourceId: string) {
    if (pendingId === sourceId) return;
    const next = !checkedById[sourceId];
    setErrorId(null);
    setPendingId(sourceId);
    setCheckedById((prev) => ({ ...prev, [sourceId]: next }));

    if (next) markJustToggled(sourceId);

    startTransition(async () => {
      const result = await onToggle({ date: dateIso, sourceId, checked: next });
      if (!result.ok) {
        setCheckedById((prev) => ({ ...prev, [sourceId]: !next }));
        setErrorId(sourceId);
      }
      setPendingId(null);
    });
  }

  const total = items.length;
  const done = items.filter((item) => checkedById[item.sourceId]).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Révisions du jour
        </h3>
        <span className="text-sm font-medium text-muted-foreground">
          {done}/{total}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const checked = checkedById[item.sourceId] ?? item.checked;
          const justToggled = justToggledKey === item.sourceId;
          return (
            <li key={item.sourceId}>
              <button
                type="button"
                onClick={() => handleToggle(item.sourceId)}
                aria-pressed={checked}
                disabled={pendingId === item.sourceId}
                className={cn(
                  "flex min-h-[44px] w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-500 disabled:opacity-60",
                  justToggled ? "bg-success/15" : "bg-muted"
                )}
              >
                <SubjectTag
                  name={item.subject.name}
                  colorIndex={item.subject.colorIndex}
                  className="size-7 shrink-0 text-[0.65rem]"
                />
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full ring-2 transition-colors",
                    checked
                      ? "bg-success ring-success"
                      : "bg-transparent ring-neutral-pending",
                    justToggled && "animate-in zoom-in-50 duration-300"
                  )}
                  aria-hidden="true"
                >
                  {checked && <Check className="size-4 text-success-foreground" />}
                </span>
                <span
                  className={cn(
                    "break-words text-base",
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
    </div>
  );
}
