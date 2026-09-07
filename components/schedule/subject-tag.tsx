import { cn } from "@/lib/utils";

// Pastille de matière (UX-DR7) : disque coloré 32px réutilisé entre l'EDT,
// la checklist du soir et les devoirs (DESIGN.md, subject-tag). La couleur
// vient de `--subject-{1..8}` (cyclique, cf. domain/schedule.ts) -- jamais
// recalculée ici, seulement lue depuis `colorIndex` déjà assigné en base.
export interface SubjectTagProps {
  name: string;
  colorIndex: number;
  className?: string;
}

function subjectInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "?";
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function SubjectTag({ name, colorIndex, className }: SubjectTagProps) {
  // Palette cyclique au-delà de 8 (AD-6) : on ramène toujours l'index dans
  // [1, 8] pour piocher un token CSS existant, même pour une très vieille
  // matière dont l'index brut a dépassé 8.
  const safeIndex = ((((colorIndex - 1) % 8) + 8) % 8) + 1;

  return (
    <span
      role="img"
      aria-label={`Matière : ${name}`}
      title={name}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full font-heading text-xs font-semibold text-white",
        className
      )}
      style={{ backgroundColor: `var(--subject-${safeIndex})` }}
    >
      {subjectInitials(name)}
    </span>
  );
}
