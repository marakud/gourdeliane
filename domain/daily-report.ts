export interface DailyReportFormInput {
  subjectId: string;
  date: string;
  lessonContent?: string;
  homeworkDescription?: string;
  homeworkPlanDate?: string;
  homeworkDueDate?: string;
  memoryContent?: string;
  memoryNote?: string;
}

export interface ParsedDailyReportInput {
  subjectId: string;
  date: Date;
  lessonContent: string | null;
  homework: {
    description: string;
    planDate: Date | null;
    dueDate: Date | null;
  } | null;
  memory: { content: string; note: string | null } | null;
}

function parseIsoDate(value: string | undefined, required: boolean) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return required ? null : undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === normalized
    ? date
    : null;
}

export function parseDailyReportInput(
  input: DailyReportFormInput
): { ok: true; value: ParsedDailyReportInput } | { ok: false; error: string } {
  const subjectId = input.subjectId.trim();
  if (!subjectId) return { ok: false, error: "Choisis une matière." };

  const date = parseIsoDate(input.date, true);
  if (!(date instanceof Date)) return { ok: false, error: "Date du cours invalide." };

  const lessonContent = input.lessonContent?.trim() || null;
  const homeworkDescription = input.homeworkDescription?.trim() || "";
  const memoryContent = input.memoryContent?.trim() || "";
  const memoryNote = input.memoryNote?.trim() || null;

  const planDate = parseIsoDate(input.homeworkPlanDate, false);
  const dueDate = parseIsoDate(input.homeworkDueDate, false);
  if (planDate === null) return { ok: false, error: "Date prévue pour faire le devoir invalide." };
  if (dueDate === null) return { ok: false, error: "Date de rendu invalide." };
  if (!homeworkDescription && (planDate || dueDate)) {
    return { ok: false, error: "Décris le devoir avant de renseigner ses dates." };
  }
  if (!memoryContent && memoryNote) {
    return { ok: false, error: "Indique le point à mémoriser avant d'ajouter une note." };
  }
  if (!lessonContent && !homeworkDescription && !memoryContent) {
    return { ok: false, error: "Renseigne au moins le cours, un devoir ou un point Mémoire." };
  }

  return {
    ok: true,
    value: {
      subjectId,
      date,
      lessonContent,
      homework: homeworkDescription
        ? {
            description: homeworkDescription,
            planDate: planDate instanceof Date ? planDate : null,
            dueDate: dueDate instanceof Date ? dueDate : null,
          }
        : null,
      memory: memoryContent ? { content: memoryContent, note: memoryNote } : null,
    },
  };
}
