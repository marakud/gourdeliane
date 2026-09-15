import { describe, expect, it } from "vitest";
import { parseDailyReportInput } from "./daily-report";

const BASE = {
  subjectId: "maths",
  date: "2026-09-15",
};

describe("parseDailyReportInput", () => {
  it("accepte un bilan regroupant cours, devoir et mémoire", () => {
    const result = parseDailyReportInput({
      ...BASE,
      lessonContent: "Addition de fractions",
      homeworkDescription: "Exercices 4 à 8",
      homeworkPlanDate: "2026-09-16",
      homeworkDueDate: "2026-09-18",
      memoryContent: "Revoir les dénominateurs",
      memoryNote: "Utiliser un multiple commun",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.homework?.planDate?.toISOString().slice(0, 10)).toBe("2026-09-16");
    expect(result.value.homework?.dueDate?.toISOString().slice(0, 10)).toBe("2026-09-18");
  });

  it("accepte une seule rubrique renseignée", () => {
    expect(parseDailyReportInput({ ...BASE, lessonContent: "Leçon" }).ok).toBe(true);
    expect(parseDailyReportInput({ ...BASE, homeworkDescription: "Exercice" }).ok).toBe(true);
    expect(parseDailyReportInput({ ...BASE, memoryContent: "Erreur" }).ok).toBe(true);
  });

  it("rejette un bilan entièrement vide", () => {
    const result = parseDailyReportInput(BASE);
    expect(result).toEqual({
      ok: false,
      error: "Renseigne au moins le cours, un devoir ou un point Mémoire.",
    });
  });

  it("rejette une date calendairement invalide", () => {
    expect(parseDailyReportInput({ ...BASE, date: "2026-02-30", lessonContent: "Leçon" }).ok).toBe(false);
  });

  it("rejette des dates de devoir sans description", () => {
    const result = parseDailyReportInput({ ...BASE, lessonContent: "Leçon", homeworkDueDate: "2026-09-18" });
    expect(result.ok).toBe(false);
  });

  it("rejette une note Mémoire sans point à mémoriser", () => {
    const result = parseDailyReportInput({ ...BASE, lessonContent: "Leçon", memoryNote: "Une note seule" });
    expect(result.ok).toBe(false);
  });
});
