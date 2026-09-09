"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Story 2.7 -- regroupe Sac, Devoirs à faire et Révisions du jour dans une
// seule "moment card" (FR-20). `complete` est calculé côté serveur
// (app/(accueil)/page.tsx, via domain/day-completion.ts::computeSoirCompletion
// -- AD-5, jamais un calcul indépendant ici) et arrive rafraîchi à chaque
// rendu suite au `revalidatePath` déjà appelé par les actions de coche. Ce
// composant se contente de réagir à ce prop : bandeau "Soirée prête !" tant
// que `complete` est vrai (état statique, rejoué à l'identique à la
// réouverture de l'app -- I/O matrix spec 2.7), avec une courte animation
// d'apparition (< 1,5s, EXPERIENCE.md) uniquement sur la transition
// false -> true observée PENDANT la session (jamais au montage initial,
// donc jamais rejouée si la soirée était déjà complète avant l'ouverture).
export interface MomentSoirCardProps {
  complete: boolean;
  children: ReactNode;
}

export function MomentSoirCard({ complete, children }: MomentSoirCardProps) {
  const previousCompleteRef = useRef(complete);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (complete && !previousCompleteRef.current) {
      setJustCompleted(true);
    }
    previousCompleteRef.current = complete;
  }, [complete]);

  return (
    <section
      aria-labelledby="moment-soir-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="moment-soir-heading"
          className="font-heading text-lg font-semibold text-foreground"
        >
          Ce soir
        </h2>
        {complete && (
          <span
            role="status"
            className={cn(
              "rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground",
              justCompleted && "animate-in fade-in-0 zoom-in-95 duration-500"
            )}
          >
            Soirée prête !
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
