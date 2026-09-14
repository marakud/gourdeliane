export const MEMORY_STATUS_TO_REVIEW = "TO_REVIEW" as const;
export const MEMORY_STATUS_LEARNING = "LEARNING" as const;
export const MEMORY_STATUS_ACQUIRED = "ACQUIRED" as const;

export type MemoryStatus =
  | typeof MEMORY_STATUS_TO_REVIEW
  | typeof MEMORY_STATUS_LEARNING
  | typeof MEMORY_STATUS_ACQUIRED;

export const MEMORY_STATUS_LABELS: Record<MemoryStatus, string> = {
  TO_REVIEW: "À revoir",
  LEARNING: "En cours",
  ACQUIRED: "Acquis",
};

export function isMemoryStatus(value: string): value is MemoryStatus {
  return value === MEMORY_STATUS_TO_REVIEW ||
    value === MEMORY_STATUS_LEARNING ||
    value === MEMORY_STATUS_ACQUIRED;
}

export interface MemoryPointView {
  id: string;
  content: string;
  note: string | null;
  status: MemoryStatus;
  reviewCount: number;
  lastReviewedLabel: string | null;
  subject: { id: string; name: string; colorIndex: number };
}

export function formatLastReviewedAt(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString("fr-FR", {
    timeZone: "America/Guadeloupe",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
