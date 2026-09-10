import {
  Atom,
  BookOpen,
  Calculator,
  Dumbbell,
  GraduationCap,
  Globe,
  MessageCircle,
  Palette,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeSubjectColorIndex } from "@/domain/schedule";
import { matchSubjectCategory, type SubjectCategory } from "@/domain/subject-icon";

// Pastille de matière (UX-DR7) : disque coloré 32px réutilisé entre l'EDT,
// la checklist du soir et les devoirs (DESIGN.md, subject-tag). La couleur
// vient de `--subject-{1..8}` (cyclique, cf. domain/schedule.ts) -- jamais
// recalculée ici, seulement lue depuis `colorIndex` déjà assigné en base.
// Refonte visuelle -- remplace les initiales textuelles par une icône
// (couleur + icône = identité de matière, demande explicite) : l'accessible
// name vient déjà de `aria-label`/`title`, jamais du glyphe affiché, donc ce
// changement ne retire aucune information au lecteur d'écran.
export interface SubjectTagProps {
  name: string;
  colorIndex: number;
  className?: string;
}

// Vit ici (composant), jamais dans `domain/subject-icon.ts` : une icône est
// un composant React (dépendance UI), incompatible avec un module domaine
// pur (AD-1) -- même séparation que `MOMENT_ICON` (moment-tabs.tsx).
const CATEGORY_ICON: Record<SubjectCategory, LucideIcon> = {
  MATHS: Calculator,
  FRANCAIS: BookOpen,
  ANGLAIS: MessageCircle,
  HISTOIRE_GEO: Globe,
  SCIENCES: Atom,
  EPS: Dumbbell,
  ARTS: Palette,
  TECHNOLOGIE: Wrench,
  GENERIC: GraduationCap,
};

export function SubjectTag({ name, colorIndex, className }: SubjectTagProps) {
  // Palette cyclique au-delà de 8 (AD-6) : on ramène toujours l'index dans
  // [1, 8] pour piocher un token CSS existant, même pour une très vieille
  // matière dont l'index brut a dépassé 8.
  const safeIndex = normalizeSubjectColorIndex(colorIndex);
  const Icon = CATEGORY_ICON[matchSubjectCategory(name)];

  return (
    <span
      role="img"
      aria-label={`Matière : ${name}`}
      title={name}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-white",
        className
      )}
      style={{ backgroundColor: `var(--subject-${safeIndex})` }}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}
