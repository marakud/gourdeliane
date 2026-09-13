import { describe, expect, it } from "vitest";
import {
  computeTimerProgress,
  formatClockDuration,
  isTimerMode,
  summarizeHomeworkTimeSessions,
  TIMER_MODE_CHRONO,
  TIMER_MODE_MINUTEUR,
} from "./homework-timer";

describe("isTimerMode", () => {
  it("accepts CHRONO and MINUTEUR", () => {
    expect(isTimerMode("CHRONO")).toBe(true);
    expect(isTimerMode("MINUTEUR")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isTimerMode("chrono")).toBe(false);
    expect(isTimerMode("")).toBe(false);
    expect(isTimerMode("PAUSE")).toBe(false);
  });
});

describe("formatClockDuration", () => {
  it("formats under an hour as MM:SS", () => {
    expect(formatClockDuration(0)).toBe("00:00");
    expect(formatClockDuration(65)).toBe("01:05");
    expect(formatClockDuration(3599)).toBe("59:59");
  });

  it("formats an hour or more as H:MM:SS", () => {
    expect(formatClockDuration(3600)).toBe("1:00:00");
    expect(formatClockDuration(3725)).toBe("1:02:05");
  });

  it("never goes negative or produces NaN for bad input", () => {
    expect(formatClockDuration(-5)).toBe("00:00");
    expect(formatClockDuration(NaN)).toBe("00:00");
  });
});

describe("computeTimerProgress", () => {
  it("CHRONO never has a remaining/overtime -- just elapsed", () => {
    const progress = computeTimerProgress(TIMER_MODE_CHRONO, null, 125);
    expect(progress).toEqual({
      elapsedSeconds: 125,
      remainingSeconds: null,
      overtimeSeconds: 0,
      isOvertime: false,
    });
  });

  it("MINUTEUR before expiry: remaining decreases, no overtime", () => {
    const progress = computeTimerProgress(TIMER_MODE_MINUTEUR, 600, 200);
    expect(progress).toEqual({
      elapsedSeconds: 200,
      remainingSeconds: 400,
      overtimeSeconds: 0,
      isOvertime: false,
    });
  });

  it("MINUTEUR exactly at expiry: remaining=0, not yet overtime", () => {
    const progress = computeTimerProgress(TIMER_MODE_MINUTEUR, 600, 600);
    expect(progress.remainingSeconds).toBe(0);
    expect(progress.overtimeSeconds).toBe(0);
    expect(progress.isOvertime).toBe(false);
  });

  it("MINUTEUR past expiry: remaining clamped to 0, overtime counts up (retour utilisateur -- jamais bloqué, juste affiché en dépassement)", () => {
    const progress = computeTimerProgress(TIMER_MODE_MINUTEUR, 600, 750);
    expect(progress).toEqual({
      elapsedSeconds: 750,
      remainingSeconds: 0,
      overtimeSeconds: 150,
      isOvertime: true,
    });
  });

  it("treats a null plannedSeconds like CHRONO even if mode says MINUTEUR (defensive)", () => {
    const progress = computeTimerProgress(TIMER_MODE_MINUTEUR, null, 100);
    expect(progress.remainingSeconds).toBeNull();
    expect(progress.isOvertime).toBe(false);
  });

  it("clamps a negative elapsed (clock skew, theoretical) to 0", () => {
    const progress = computeTimerProgress(TIMER_MODE_CHRONO, null, -10);
    expect(progress.elapsedSeconds).toBe(0);
  });
});

describe("summarizeHomeworkTimeSessions", () => {
  it("puts a session with no endedAtIso into activeSessionByDevoirId", () => {
    const { activeSessionByDevoirId, totalEndedSecondsByDevoirId } =
      summarizeHomeworkTimeSessions([
        {
          devoirId: "d1",
          mode: TIMER_MODE_MINUTEUR,
          plannedSeconds: 600,
          startedAtIso: "2026-09-13T10:00:00.000Z",
          endedAtIso: null,
        },
      ]);

    expect(activeSessionByDevoirId.get("d1")).toEqual({
      mode: TIMER_MODE_MINUTEUR,
      plannedSeconds: 600,
      startedAtIso: "2026-09-13T10:00:00.000Z",
    });
    expect(totalEndedSecondsByDevoirId.size).toBe(0);
  });

  it("sums ended sessions for the same devoir", () => {
    const { totalEndedSecondsByDevoirId } = summarizeHomeworkTimeSessions([
      {
        devoirId: "d1",
        mode: TIMER_MODE_CHRONO,
        plannedSeconds: null,
        startedAtIso: "2026-09-13T10:00:00.000Z",
        endedAtIso: "2026-09-13T10:10:00.000Z", // 600s
      },
      {
        devoirId: "d1",
        mode: TIMER_MODE_CHRONO,
        plannedSeconds: null,
        startedAtIso: "2026-09-14T10:00:00.000Z",
        endedAtIso: "2026-09-14T10:05:00.000Z", // 300s
      },
    ]);

    expect(totalEndedSecondsByDevoirId.get("d1")).toBe(900);
  });

  it("keeps totals separate per devoir", () => {
    const { totalEndedSecondsByDevoirId } = summarizeHomeworkTimeSessions([
      {
        devoirId: "d1",
        mode: TIMER_MODE_CHRONO,
        plannedSeconds: null,
        startedAtIso: "2026-09-13T10:00:00.000Z",
        endedAtIso: "2026-09-13T10:10:00.000Z",
      },
      {
        devoirId: "d2",
        mode: TIMER_MODE_CHRONO,
        plannedSeconds: null,
        startedAtIso: "2026-09-13T10:00:00.000Z",
        endedAtIso: "2026-09-13T10:20:00.000Z",
      },
    ]);

    expect(totalEndedSecondsByDevoirId.get("d1")).toBe(600);
    expect(totalEndedSecondsByDevoirId.get("d2")).toBe(1200);
  });

  it("never lets an inconsistent negative duration subtract from the total", () => {
    const { totalEndedSecondsByDevoirId } = summarizeHomeworkTimeSessions([
      {
        devoirId: "d1",
        mode: TIMER_MODE_CHRONO,
        plannedSeconds: null,
        startedAtIso: "2026-09-13T10:10:00.000Z",
        endedAtIso: "2026-09-13T10:00:00.000Z", // endedAt before startedAt
      },
    ]);

    expect(totalEndedSecondsByDevoirId.get("d1")).toBe(0);
  });

  it("returns empty maps for an empty input", () => {
    const { activeSessionByDevoirId, totalEndedSecondsByDevoirId } =
      summarizeHomeworkTimeSessions([]);
    expect(activeSessionByDevoirId.size).toBe(0);
    expect(totalEndedSecondsByDevoirId.size).toBe(0);
  });
});
