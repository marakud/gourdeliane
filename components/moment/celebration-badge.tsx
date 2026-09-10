import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Badge de complétude réutilisable (extrait de MomentSoirCard, Story 2.7,
// pour la refonte visuelle -- même pattern maintenant partagé par
// FixedChecklist Matin/Retour). Statique tant que `complete` reste vrai
// (jamais une animation en boucle, EXPERIENCE.md) ; ne pop (`animate-in`)
// que sur la transition observée pendant la session (`justCompleted`, cf.
// `lib/use-just-completed.ts`), jamais au montage initial.
export interface CelebrationBadgeProps {
  complete: boolean;
  justCompleted: boolean;
  label: string;
}

export function CelebrationBadge({
  complete,
  justCompleted,
  label,
}: CelebrationBadgeProps) {
  if (!complete) return null;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground",
        justCompleted && "animate-in fade-in-0 zoom-in-95 duration-500"
      )}
    >
      <Sparkles aria-hidden="true" className="h-4 w-4" />
      {label}
    </span>
  );
}
