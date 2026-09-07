import { describe, expect, it } from "vitest";
import {
  assignNextColorIndex,
  dedupeSubjectsFromSlots,
  deriveDaySlots,
  validateSlot,
  type DaySlot,
  type SubjectRef,
} from "./schedule";

describe("assignNextColorIndex (AD-6)", () => {
  it("assigns colorIndex 1 to the first subject", () => {
    expect(assignNextColorIndex([])).toBe(1);
  });

  it("assigns the next colorIndex after the current highest", () => {
    expect(assignNextColorIndex([{ colorIndex: 1 }, { colorIndex: 2 }])).toBe(3);
  });

  it("cycles back to 1 once the palette of 8 colors is exhausted", () => {
    const eightSubjects = Array.from({ length: 8 }, (_, i) => ({
      colorIndex: i + 1,
    }));
    expect(assignNextColorIndex(eightSubjects)).toBe(1);
  });

  it("never reassigns a hole left by a deleted subject while a higher index is still active", () => {
    // Matières 1, 2, 3 existaient ; la matière colorIndex=2 a été supprimée.
    // Le prochain index ne doit pas redevenir 2 (le trou) tant que 3 (le
    // plus haut restant) n'a pas bouclé -- sinon la nouvelle matière
    // entrerait en collision avec la matière colorIndex=3 encore active.
    const remaining = [{ colorIndex: 1 }, { colorIndex: 3 }];
    expect(assignNextColorIndex(remaining)).toBe(4);
  });
});

describe("validateSlot (I/O matrix spec 1.2)", () => {
  const base = {
    weekday: "MONDAY",
    startTime: "08:00",
    endTime: "09:00",
    subjectName: "Maths",
  };

  it("accepts a valid slot on a brand new subject", () => {
    expect(validateSlot(base)).toEqual({ valid: true });
  });

  it("accepts a valid slot on an already-used subject name", () => {
    expect(validateSlot({ ...base, subjectName: "maths" })).toEqual({
      valid: true,
    });
  });

  it("rejects an end time before the start time", () => {
    const result = validateSlot({ ...base, startTime: "10:00", endTime: "09:00" });
    expect(result.valid).toBe(false);
  });

  it("rejects an end time equal to the start time", () => {
    const result = validateSlot({ ...base, startTime: "09:00", endTime: "09:00" });
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid weekday", () => {
    const result = validateSlot({ ...base, weekday: "SOMEDAY" });
    expect(result.valid).toBe(false);
  });

  it("rejects a malformed time string", () => {
    const result = validateSlot({ ...base, startTime: "8h00" });
    expect(result.valid).toBe(false);
  });

  it("rejects an empty subject name", () => {
    const result = validateSlot({ ...base, subjectName: "   " });
    expect(result.valid).toBe(false);
  });
});

describe("deriveDaySlots (I/O matrix spec 1.3)", () => {
  const maths: DaySlot["subject"] = { name: "Maths", colorIndex: 1 };
  const allSlots: DaySlot[] = [
    { id: "1", weekday: "MONDAY", startTime: "10:00", endTime: "11:00", subject: maths },
    { id: "2", weekday: "MONDAY", startTime: "08:00", endTime: "09:00", subject: maths },
    { id: "3", weekday: "TUESDAY", startTime: "08:00", endTime: "09:00", subject: maths },
  ];

  it("filters by weekday and sorts by start time", () => {
    const result = deriveDaySlots(allSlots, "MONDAY", "2026-09-07", new Set());
    expect(result.map((s) => s.id)).toEqual(["2", "1"]);
  });

  it("returns an empty list for a weekday with no slots", () => {
    const result = deriveDaySlots(allSlots, "SUNDAY", "2026-09-06", new Set());
    expect(result).toEqual([]);
  });

  it("returns an empty list when the date is marked no-school, even if the weekday normally has slots", () => {
    const result = deriveDaySlots(
      allSlots,
      "MONDAY",
      "2026-09-07",
      new Set(["2026-09-07"])
    );
    expect(result).toEqual([]);
  });

  it("is unaffected by a no-school date that doesn't match the day being derived", () => {
    const result = deriveDaySlots(
      allSlots,
      "MONDAY",
      "2026-09-07",
      new Set(["2026-09-08"])
    );
    expect(result.map((s) => s.id)).toEqual(["2", "1"]);
  });
});

describe("dedupeSubjectsFromSlots (Story 2.1 -- sac du soir)", () => {
  const maths: SubjectRef = { id: "s1", name: "Maths", colorIndex: 1 };
  const eps: SubjectRef = { id: "s2", name: "EPS", colorIndex: 2 };
  const subjects: SubjectRef[] = [maths, eps];

  it("dedupes a subject appearing in multiple slots the same day, keeping first-seen order", () => {
    const slots = [
      { subject: { name: "Maths" } },
      { subject: { name: "EPS" } },
      { subject: { name: "Maths" } },
    ];

    const result = dedupeSubjectsFromSlots(slots, subjects);

    expect(result).toEqual([maths, eps]);
  });

  it("returns an empty list for no slots", () => {
    expect(dedupeSubjectsFromSlots([], subjects)).toEqual([]);
  });

  it("silently skips a slot whose subject name isn't found in subjects", () => {
    const slots = [{ subject: { name: "Musique" } }, { subject: { name: "Maths" } }];

    const result = dedupeSubjectsFromSlots(slots, subjects);

    expect(result).toEqual([maths]);
  });
});
