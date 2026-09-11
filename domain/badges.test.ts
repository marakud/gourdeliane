import { describe, expect, it } from "vitest";
import { BADGE_THRESHOLDS, computeBadges } from "./badges";

describe("computeBadges (refonte visuelle étape 8, FR-14)", () => {
  it("unlocks no badge when best streak is zero", () => {
    const badges = computeBadges(0);
    expect(badges).toHaveLength(BADGE_THRESHOLDS.length);
    expect(badges.every((badge) => !badge.unlocked)).toBe(true);
  });

  it("unlocks exactly the badges at or below the best streak", () => {
    const badges = computeBadges(7);
    const unlockedThresholds = badges
      .filter((badge) => badge.unlocked)
      .map((badge) => badge.threshold);
    expect(unlockedThresholds).toEqual([3, 7]);
  });

  it("unlocks a badge exactly at its threshold (inclusive)", () => {
    const badges = computeBadges(3);
    expect(badges.find((b) => b.threshold === 3)?.unlocked).toBe(true);
    expect(badges.find((b) => b.threshold === 7)?.unlocked).toBe(false);
  });

  it("unlocks every badge once the best streak reaches the highest threshold", () => {
    const badges = computeBadges(100);
    expect(badges.every((badge) => badge.unlocked)).toBe(true);
  });
});
