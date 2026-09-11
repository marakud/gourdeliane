"use client";

import { useState, useTransition } from "react";
import { Check, Settings } from "lucide-react";
import type { ActionResult, ToggleChecklistItemInput } from "@/actions/checklist";
import { CelebrationBadge } from "@/components/moment/celebration-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useJustCompleted } from "@/lib/use-just-completed";
import { useJustToggled } from "@/lib/use-just-toggled";
import { cn } from "@/lib/utils";

// Bloc liste plate fixe (Accueil) -- posé pour "Ce matin" en Story 2.2,
// généralisé en Story 2.3 pour servir aussi "Retour" sans dupliquer ce
// composant (Boundaries spec 2.3 : Matin doit continuer de fonctionner sans
// régression après cette généralisation). Reçoit la checklist déjà dérivée
// par domain/checklist.ts::deriveFixedChecklist -- liste plate (pas de
// groupement par matière, contrairement au sac, cf. Never de la spec 2.2).
// Même mécanique de mise à jour optimiste que SacChecklist
// (components/checklist/sac-checklist.tsx), via la Server Action de
// cochage reçue en prop (`toggleMatinChecklistItem`/`toggleRetourChecklistItem`,
// actions/checklist.ts) plutôt qu'appelée en dur ici.

export interface FixedChecklistItemView {
  sourceId: string;
  label: string;
  checked: boolean;
}

/** Signature partagée par `toggleMatinChecklistItem` et
 * `toggleRetourChecklistItem` (actions/checklist.ts) -- ce composant n'a pas
 * à connaître `checklistType`/`sourceType`, déjà fixés par le wrapper que
 * l'appelant transmet. */
export type ToggleFixedChecklistItemAction = (
  input: Omit<ToggleChecklistItemInput, "checklistType" | "sourceType">
) => Promise<ActionResult<null>>;

export interface FixedChecklistProps {
  title: string;
  items: FixedChecklistItemView[];
  // Jour pour lequel la checklist est préparée ("aujourd'hui" pour Matin
  // comme pour Retour, AD-4) -- transmis tel quel à la Server Action (déjà
  // calculé côté serveur par app/(accueil)/page.tsx, jamais recalculé ici).
  dateIso: string;
  // `id` du <h2> pour `aria-labelledby` -- doit être unique par instance
  // puisque Matin et Retour s'affichent tous deux sur Accueil (ex.
  // "matin-heading" / "retour-heading"). Ignoré si `hideTitle`.
  headingId: string;
  onToggle: ToggleFixedChecklistItemAction;
  // Retour utilisateur (Accueil contextuel, MomentTabs) -- `title` devient
  // redondant avec le libellé de l'onglet parent ("Ce matin"/"Retour")
  // quand ce composant vit dans un panneau d'onglet ; masque le `<h2>` (et
  // le `<section>` qui le référence, devenu un simple `<div>`) sans changer
  // le reste -- le compteur X/Y reste affiché.
  hideTitle?: boolean;
}

export function FixedChecklist({
  title,
  items,
  dateIso,
  headingId,
  onToggle,
  hideTitle = false,
}: FixedChecklistProps) {
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
  // Refonte visuelle -- clé dont la coche vient d'être animée (pop + flash
  // de couleur bref sur la ligne), partagé avec SacChecklist/
  // RevisionsChecklist (`lib/use-just-toggled.ts`).
  const { justToggledKey, markJustToggled } = useJustToggled();
  const [, startTransition] = useTransition();

  function handleToggle(sourceId: string) {
    if (pendingId === sourceId) return;

    const next = !checkedById[sourceId];
    setErrorId(null);
    setPendingId(sourceId);
    setCheckedById((prev) => ({ ...prev, [sourceId]: next }));

    if (next) markJustToggled(sourceId);

    startTransition(async () => {
      const result = await onToggle({
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
  // Refonte visuelle -- célébration de moment (Matin/Retour n'ont pas de
  // "moment card" englobante comme MomentSoirCard pour Ce soir : ce
  // composant EST le contenu entier de leur panneau, donc porte lui-même le
  // badge). Un bloc vide (`total === 0`) n'est jamais "complet" ici
  // (contrairement à `isBlockComplete` du domaine) -- pas de célébration
  // pour une liste sans aucun item, cas volontairement distinct de la
  // complétude utilisée pour le repli visuel/la jauge (Story 3.2, étape 2).
  const complete = total > 0 && done === total;
  const justCompleted = useJustCompleted(complete);

  const Wrapper = hideTitle ? "div" : "section";

  return (
    <Wrapper
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-brand ring-1 ring-border"
    >
      <div
        className={cn(
          "flex items-center gap-2",
          hideTitle ? "justify-end" : "justify-between"
        )}
      >
        {/* `sr-only` plutôt qu'omis quand `hideTitle` (correctif de revue) --
            sans lui, la hiérarchie de titres de la page sautait de <h1>
            (Accueil) à <h3> (items de la liste), un niveau manquant qui
            perturbe la navigation par titres au lecteur d'écran. `sr-only`
            est `position: absolute` : ne participe pas au flex ni au `gap`
            de cette ligne, donc ne laisse aucun espace vide quand `total`
            est 0 (autre correctif de revue -- avant, un `null` ici laissait
            la ligne d'en-tête entièrement vide mais consommait quand même
            le `gap-4` du parent). */}
        <h2
          id={headingId}
          className={cn(
            "font-heading text-lg font-semibold text-foreground",
            hideTitle && "sr-only"
          )}
        >
          {title}
        </h2>
        {total > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {done}/{total}
          </span>
        )}
      </div>

      <CelebrationBadge
        complete={complete}
        justCompleted={justCompleted}
        label="Tout est prêt !"
      />

      {total === 0 && (
        // Refonte visuelle étape 6 -- `Settings`, même icône que le lien
        // Réglages de la barre haute (top-bar.tsx) : ce message pointe vers
        // cet écran, réutilise directement son icône plutôt qu'une nouvelle.
        <EmptyState
          icon={Settings}
          message="Aucun item dans cette liste -- ajoutes-en depuis Réglages."
          layout="inline"
        />
      )}

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
                  "flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-500 disabled:opacity-60",
                  justToggled ? "bg-success/15" : "bg-muted"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full ring-2 transition-colors",
                    checked
                      ? "bg-success ring-success"
                      : "bg-transparent ring-neutral-pending",
                    justToggled && "animate-in zoom-in-50 duration-300"
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
    </Wrapper>
  );
}
