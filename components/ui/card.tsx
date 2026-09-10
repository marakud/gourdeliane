import * as React from "react";
import { cn } from "@/lib/utils";

// Refonte visuelle -- remplace le pattern `rounded-2xl bg-card p-4 ring-1
// ring-border` dupliqué à l'identique dans 8+ fichiers (MomentSoirCard,
// FirstNameCard, WeekParityCard, NotificationsSection...). Contrairement à
// l'`Alert`/`Banner` générique explicitement refusé pour la Story 3.2 (un
// seul besoin réel à l'époque), le besoin est ici avéré et répété -- une
// vraie abstraction, pas une anticipation. Adopté progressivement par les
// écrans au fil des étapes de la refonte, jamais en un seul passage sur tous
// les fichiers existants à la fois.

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl bg-card p-4 shadow-brand ring-1 ring-border",
        className
      )}
      {...props}
    />
  );
}

export { Card };
