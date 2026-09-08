import { describe, expect, it } from "vitest";
import { attachDevoirsToSlots, computeDaysRemaining } from "./homework";

describe("computeDaysRemaining (spec 2.4 amendment I/O matrix)", () => {
  it("returns 0 when the échéance is today", () => {
    expect(computeDaysRemaining("2026-12-20", "2026-12-20")).toBe(0);
  });

  it("returns a positive count when the échéance is in the future", () => {
    expect(computeDaysRemaining("2026-12-23", "2026-12-20")).toBe(3);
  });

  it("returns a negative count when the échéance is in the past", () => {
    expect(computeDaysRemaining("2026-12-17", "2026-12-20")).toBe(-3);
  });

  it("handles a month boundary correctly", () => {
    expect(computeDaysRemaining("2027-01-02", "2026-12-30")).toBe(3);
  });
});

describe("attachDevoirsToSlots (spec 2.4 amendment -- lien EDT)", () => {
  const maths = { name: "Maths", colorIndex: 1 };
  const slotA = { id: "slot-a" };
  const slotB = { id: "slot-b" };

  it("attaches a devoir to the matching slot, keyed by scheduleSlotId", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Exos p.42",
        done: false,
        scheduleSlotId: "slot-a",
        subject: maths,
      },
    ];

    const result = attachDevoirsToSlots([slotA, slotB], devoirs);

    expect(result.find((s) => s.id === "slot-a")?.devoirs).toEqual([
      { id: "d1", description: "Exos p.42", done: false, subject: maths },
    ]);
    expect(result.find((s) => s.id === "slot-b")?.devoirs).toBeUndefined();
  });

  it("swapping the lookup key would break this -- confirms the join key is id, not subject", () => {
    const otherSubject = { name: "EPS", colorIndex: 2 };
    const devoirs = [
      {
        id: "d1",
        description: "Tenue de sport",
        done: false,
        scheduleSlotId: "slot-b",
        subject: otherSubject,
      },
    ];

    const result = attachDevoirsToSlots([slotA, slotB], devoirs);

    expect(result.find((s) => s.id === "slot-a")?.devoirs).toBeUndefined();
    expect(result.find((s) => s.id === "slot-b")?.devoirs?.[0].id).toBe("d1");
  });

  it("returns undefined (not an empty array) for a slot with no attached devoirs", () => {
    const result = attachDevoirsToSlots([slotA], []);
    expect(result[0].devoirs).toBeUndefined();
  });

  it("ignores a devoir with no scheduleSlotId", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Sans créneau",
        done: false,
        scheduleSlotId: null,
        subject: maths,
      },
    ];

    const result = attachDevoirsToSlots([slotA], devoirs);
    expect(result[0].devoirs).toBeUndefined();
  });

  it("ignores a devoir whose scheduleSlotId matches no provided slot", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Créneau d'un autre jour",
        done: false,
        scheduleSlotId: "slot-elsewhere",
        subject: maths,
      },
    ];

    const result = attachDevoirsToSlots([slotA], devoirs);
    expect(result[0].devoirs).toBeUndefined();
  });

  it("groups multiple devoirs under the same slot and preserves each devoir's own done state", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Premier",
        done: true,
        scheduleSlotId: "slot-a",
        subject: maths,
      },
      {
        id: "d2",
        description: "Second",
        done: false,
        scheduleSlotId: "slot-a",
        subject: maths,
      },
    ];

    const result = attachDevoirsToSlots([slotA], devoirs);
    expect(result[0].devoirs).toEqual([
      { id: "d1", description: "Premier", done: true, subject: maths },
      { id: "d2", description: "Second", done: false, subject: maths },
    ]);
  });
});
