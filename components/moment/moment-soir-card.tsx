"use client";

import type { ReactNode } from "react";
import { CelebrationBadge } from "./celebration-badge";
import { useJustCompleted } from "@/lib/use-just-completed";

// Story 2.7 -- regroupe Sac, Devoirs à faire et Révisions du jour dans une
// seule "moment card" (FR-20). `complete` est calculé côté serveur
// (app/(accueil)/page.tsx, via domain/day-completion.ts::computeSoirCompletion
// -- AD-5, jamais un calcul indépendant ici) et arrive rafraîchi à chaque
// rendu suite au `revalidatePath` déjà appelé par les actions de coche. Ce
// composant se contente de réagir à ce prop : bandeau "Tout est prêt !" tant
// que `complete` est vrai (état statique, rejoué à l'identique à la
// réouverture de l'app -- I/O matrix spec 2.7), avec une courte animation
// d'apparition (< 1,5s, EXPERIENCE.md) uniquement sur la transition
// false -> true observée PENDANT la session (jamais au montage initial,
// donc jamais rejouée si la soirée était déjà complète avant l'ouverture) --
// détection extraite dans `useJustCompleted` (refonte visuelle, même pattern
// désormais partagé par `FixedChecklist` Matin/Retour), badge extrait dans
// `CelebrationBadge`.
//
// Retour utilisateur (Accueil contextuel) -- ce composant vit désormais
// dans le panneau "Ce soir" de `MomentTabs` : son propre titre "Ce soir"
// visuel et son `<section>` (landmark) sont devenus redondants avec le
// libellé de l'onglet parent, retirés -- ne garde que la carte visuelle
// (cohérente avec les cartes Matin/Retour, `FixedChecklist`) et le badge de
// complétude. Un `<h2>` "Ce soir" visuellement masqué (`sr-only`) est
// néanmoins conservé (correctif de revue) : sans lui, la hiérarchie de
// titres de la page sautait de `<h1>` (accueil) à `<h3>` (Sac/Devoirs/
// Révisions), un niveau manquant qui perturbe la navigation par titres au
// lecteur d'écran -- indépendant du choix de ne plus exposer de landmark
// séparé, purement une question de hiérarchie `<hN>`.
export interface MomentSoirCardProps {
  complete: boolean;
  children: ReactNode;
}

export function MomentSoirCard({ complete, children }: MomentSoirCardProps) {
  const justCompleted = useJustCompleted(complete);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-brand ring-1 ring-border">
      <h2 className="sr-only">Ce soir</h2>
      <CelebrationBadge
        complete={complete}
        justCompleted={justCompleted}
        label="Tout est prêt !"
      />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
