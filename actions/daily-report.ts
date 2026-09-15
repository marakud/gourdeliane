"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/current-user";
import { createDailyReport } from "@/data/daily-report";
import {
  parseDailyReportInput,
  type DailyReportFormInput,
} from "@/domain/daily-report";

export type DailyReportActionResult =
  | {
      ok: true;
      data: {
        lessonLogId: string | null;
        homeworkId: string | null;
        memoryPointId: string | null;
      };
    }
  | { ok: false; error: string };

function refreshAffectedPages() {
  for (const path of ["/", "/cahier-de-texte", "/mes-taches", "/edt", "/memoire"]) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.error(`revalidatePath(${path}) failed:`, error);
    }
  }
}

export async function createDailyReportAction(
  input: DailyReportFormInput
): Promise<DailyReportActionResult> {
  const parsed = parseDailyReportInput(input);
  if (!parsed.ok) return parsed;

  try {
    const userId = await requireUserId();
    const result = await createDailyReport(userId, parsed.value);
    refreshAffectedPages();
    return { ok: true, data: result };
  } catch (error) {
    console.error("createDailyReportAction failed:", error);
    return { ok: false, error: "Impossible d'enregistrer le bilan. Réessaie." };
  }
}
