import { describe, expect, it } from "vitest";
import { LEVEL_TIERS, STREAK_MILESTONES, STREAK_MILESTONE_BONUS, computeRank, nextLevelTier, rankMultiplier } from "./levelConfig.js";

describe("computeRank", () => {
  it("returns NPC for 0 xp", () => {
    expect(computeRank(0)).toBe("NPC");
  });

  it("returns the highest tier whose minXp is met", () => {
    expect(computeRank(49)).toBe("NPC");
    expect(computeRank(50)).toBe("NORMIE");
    expect(computeRank(199)).toBe("NORMIE");
    expect(computeRank(200)).toBe("SIGMA");
    expect(computeRank(30_000)).toBe("NEURAL_GOD");
    expect(computeRank(1_000_000)).toBe("NEURAL_GOD");
  });
});

describe("rankMultiplier", () => {
  it("matches the documented multiplier ladder", () => {
    expect(rankMultiplier("NPC")).toBe(1);
    expect(rankMultiplier("SIGMA")).toBe(1.2);
    expect(rankMultiplier("GIGACHAD")).toBe(1.5);
    expect(rankMultiplier("BRAIN_LORD")).toBe(2);
    expect(rankMultiplier("MEME_EMPEROR")).toBe(3);
  });

  it("is monotonically non-decreasing as rank increases", () => {
    const ascending = [...LEVEL_TIERS].reverse();
    for (let i = 1; i < ascending.length; i++) {
      expect(ascending[i].multiplier).toBeGreaterThanOrEqual(ascending[i - 1].multiplier);
    }
  });
});

describe("nextLevelTier", () => {
  it("returns the next tier to unlock", () => {
    expect(nextLevelTier(0)?.rank).toBe("NORMIE");
    expect(nextLevelTier(199)?.rank).toBe("SIGMA");
  });

  it("returns null once the max rank is reached", () => {
    expect(nextLevelTier(30_000)).toBeNull();
  });
});

describe("streak milestone config", () => {
  it("has a bonus entry for every milestone", () => {
    for (const milestone of STREAK_MILESTONES) {
      expect(STREAK_MILESTONE_BONUS[milestone]).toBeDefined();
      expect(STREAK_MILESTONE_BONUS[milestone].xp).toBeGreaterThan(0);
      expect(STREAK_MILESTONE_BONUS[milestone].points).toBeGreaterThan(0);
    }
  });

  it("pays out strictly larger bonuses for longer streaks", () => {
    for (let i = 1; i < STREAK_MILESTONES.length; i++) {
      const prev = STREAK_MILESTONE_BONUS[STREAK_MILESTONES[i - 1]];
      const curr = STREAK_MILESTONE_BONUS[STREAK_MILESTONES[i]];
      expect(curr.points).toBeGreaterThan(prev.points);
      expect(curr.xp).toBeGreaterThan(prev.xp);
    }
  });
});
