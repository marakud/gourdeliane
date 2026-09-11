import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Refonte visuelle étape 6 -- icône + message pour les listes/écrans sans
// contenu, au lieu d'un texte seul. Ne porte AUCUN décor de carte propre
// (bg/ring) : plusieurs appelants (DevoirsList, FixedChecklist) sont déjà
// rendus à l'intérieur d'une carte existante (MomentSoirCard,
// FixedChecklist lui-même) -- en ajouter un ici les imbriquerait en double.
// Les appelants autonomes (DayView, WeekGrid) posent leur propre conteneur
// autour.
//
// Deux mises en page : `stacked` (icône au-dessus, centré) pour un bloc qui
// occupe tout l'espace normalement dévolu au contenu (aucun créneau ce
// jour/cette semaine) ; `inline` (icône à côté du texte, aligné à gauche)
// pour une ligne ponctuelle au milieu d'un écran par ailleurs rempli (ex.
// "Rien à faire ce soir, bravo !" sous le titre "Devoirs à faire").
export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  layout?: "stacked" | "inline";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  message,
  layout = "stacked",
  className,
}: EmptyStateProps) {
  if (layout === "inline") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-base text-muted-foreground",
          className
        )}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
        {message}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-center",
        className
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-8 text-muted-foreground/50"
        strokeWidth={1.5}
      />
      <p className="text-base text-muted-foreground">{message}</p>
    </div>
  );
}
