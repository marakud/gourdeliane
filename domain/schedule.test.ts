import { describe, expect, it } from "vitest";
import { assignNextColorIndex, validateSlot } from "./schedule";

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
