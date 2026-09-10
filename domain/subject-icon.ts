// CartableFlow -- domain/subject-icon.ts (refonte visuelle)
//
// Détermine une catégorie visuelle à partir du nom (libre) d'une matière,
// pour lui associer une icône reconnaissable (components/schedule/
// subject-tag.tsx). Pure, aucune dépendance UI (AD-1) -- l'icône réelle
// (lucide-react) est choisie côté composant, jamais ici. Correspondance
// tolérante (accents/casse/variantes -- "Mathématiques"/"Maths"/"MATH"
// doivent tous matcher) plutôt qu'une égalité stricte sur le nom : le nom
// d'une matière est un champ libre saisi par l'utilisateur (Subject.name),
// jamais une valeur contrôlée.

export type SubjectCategory =
  | "MATHS"
  | "FRANCAIS"
  | "ANGLAIS"
  | "HISTOIRE_GEO"
  | "SCIENCES"
  | "EPS"
  | "ARTS"
  | "TECHNOLOGIE"
  | "GENERIC";

// Plage Unicode "Combining Diacritical Marks" (U+0300 - U+036F), en
// échappement \uXXXX explicite -- retire les accents après `normalize("NFD")`
// (ex. "é" -> "e" + accent combinant, l'accent est ensuite supprimé) pour que
// la correspondance par mot-clé ignore la casse et les accents.
const COMBINING_DIACRITICS_RANGE_START = 0x0300;
const COMBINING_DIACRITICS_RANGE_END = 0x036f;

function normalize(name: string): string {
  const decomposed = name.normalize("NFD");
  let result = "";
  for (const char of decomposed) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (
      codePoint >= COMBINING_DIACRITICS_RANGE_START &&
      codePoint <= COMBINING_DIACRITICS_RANGE_END
    ) {
      continue;
    }
    result += char;
  }
  return result.toLowerCase().trim();
}

// Ordre volontaire : les catégories les plus spécifiques d'abord, pour que
// des noms composés (ex. "Histoire des Arts") tombent sur un choix
// raisonnable plutôt que sur le premier mot-clé générique rencontré -- il
// n'existe pas de "bonne" réponse unique dans ce cas précis, seulement un
// choix assumé.
const CATEGORY_KEYWORDS: { category: SubjectCategory; keywords: string[] }[] = [
  { category: "MATHS", keywords: ["math"] },
  { category: "ANGLAIS", keywords: ["anglais", "english"] },
  { category: "FRANCAIS", keywords: ["francais"] },
  { category: "HISTOIRE_GEO", keywords: ["histoire", "geographie", "geo", "hg"] },
  { category: "SCIENCES", keywords: ["science", "svt", "physique", "chimie", "biologie"] },
  { category: "EPS", keywords: ["eps", "sport"] },
  { category: "TECHNOLOGIE", keywords: ["techno"] },
  { category: "ARTS", keywords: ["art", "dessin"] },
];

/** Catégorie visuelle pour une matière -- `GENERIC` en repli (ex.
 * "Espagnol", "Musique", "SES", ou tout nom qui ne correspond à aucune
 * catégorie connue) plutôt que de forcer une correspondance hasardeuse. */
export function matchSubjectCategory(name: string): SubjectCategory {
  const normalized = normalize(name);
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }
  return "GENERIC";
}
