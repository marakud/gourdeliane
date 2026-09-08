"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { SubjectTag } from "@/components/schedule/subject-tag";
import { toggleChecklistItem } from "@/actions/checklist";
import { cn } from "@/lib/utils";

// Bloc "Avant d'aller se coucher" (Accueil, Story 2.1, renommé/étendu retour
// utilisateur pour aussi rappeler les devoirs à rendre demain). Reçoit la
// checklist déjà dérivée par domain/checklist.ts::deriveSacChecklist -- ce
// composant ne recalcule rien, il affiche et coche/décoche via la Server
// Action `toggleChecklistItem`, avec mise à jour optimiste (annulée si
// l'action échoue) pour un retour immédiat au tap (UX-DR : animation < 300ms).
// `devoirsForTomorrow` est purement informatif (lecture seule) -- éditer/
// cocher/supprimer un devoir reste réservé au bloc "Devoirs" plus bas sur la
// page (pas de double UI de mutation pour la même donnée).

export interface SacChecklistItem {
  sourceId: string;
  label: string;
  checked: boolean;
}

export interface SacChecklistGroup {
  subject: { id: string; name: string; colorIndex: number };
  items: SacChecklistItem[];
}

export interface SacChecklistDevoir {
  id: string;
  description: string;
  subject: { name: string; colorIndex: number };
}

export interface SacChecklistProps {
  groups: SacChecklistGroup[];
  devoirsForTomorrow?: SacChecklistDevoir[];
  // Jour pour lequel la checklist est préparée ("demain"), ISO "yyyy-MM-dd"
  // -- transmis tel quel à la Server Action (AD-4 : déjà calculé côté
  // serveur par app/(accueil)/page.tsx, jamais recalculé ici).
  dateIso: string;
}

export function SacChecklist({
  groups,
  devoirsForTomorrow = [],
  dateIso,
}: SacChecklistProps) {
  const [checkedById, setCheckedById] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const group of groups) {
        for (const item of group.items) {
          initial[item.sourceId] = item.checked;
        }
      }
      return initial;
    }
  );
  const [errorId, setErrorId] = useState<string | null>(null);
  // sourceId en cours d'enregistrement -- désactive uniquement CET item
  // pendant l'aller-retour serveur (pas toute la liste), et empêche un
  // double-tap rapide sur le même item de déclencher deux upserts concurrents
  // dont l'ordre de résolution n'est pas garanti.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(sourceId: string) {
    if (pendingId === sourceId) return;

    const next = !checkedById[sourceId];
    setErrorId(null);
    setPendingId(sourceId);
    setCheckedById((prev) => ({ ...prev, [sourceId]: next }));

    startTransition(async () => {
      const result = await toggleChecklistItem({
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

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const done = groups.reduce(
    (sum, group) =>
      sum + group.items.filter((item) => checkedById[item.sourceId]).length,
    0
  );

  return (
    <section
      aria-labelledby="sac-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="sac-heading"
          className="font-heading text-lg font-semibold text-foreground"
        >
          Avant d&apos;aller se coucher
        </h2>
        {total > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {done}/{total}
          </span>
        )}
      </div>

      {groups.length > 0 && (
        <ul className="flex flex-col gap-4">
        {groups.map((group) => (
          <li key={group.subject.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <SubjectTag
                name={group.subject.name}
                colorIndex={group.subject.colorIndex}
                className="size-7 text-[0.65rem]"
              />
              <span className="text-base font-semibold text-foreground">
                {group.subject.name}
              </span>
            </div>

            {group.items.length === 0 ? (
              <p className="pl-9 text-sm text-muted-foreground">
                Aucun objet défini pour cette matière.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {group.items.map((item) => {
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
                          {checked && (
                            <Check className="size-4 text-success-foreground" />
                          )}
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
            )}
          </li>
        ))}
        </ul>
      )}

      {devoirsForTomorrow.length > 0 && (
        <div
          className={cn(
            "flex flex-col gap-2",
            groups.length > 0 && "border-t border-border pt-3"
          )}
        >
          <h3 className="text-sm font-semibold text-foreground">
            Devoirs pour demain
          </h3>
          <ul className="flex flex-col gap-1.5">
            {devoirsForTomorrow.map((devoir) => (
              <li
                key={devoir.id}
                className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2"
              >
                <SubjectTag
                  name={devoir.subject.name}
                  colorIndex={devoir.subject.colorIndex}
                  className="size-7 text-[0.65rem]"
                />
                <span className="text-base text-foreground">
                  {devoir.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
