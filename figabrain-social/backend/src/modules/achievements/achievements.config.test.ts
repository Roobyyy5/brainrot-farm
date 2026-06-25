import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_CHECKS, type AchievementContext } from "./achievements.config.js";

const BASE_CONTEXT: AchievementContext = {
  postsCount: 0,
  commentsCount: 0,
  likesGiven: 0,
  totalReferrals: 0,
  loginStreak: 0,
  reputation: 0,
};

describe("ACHIEVEMENT_CATALOG", () => {
  it("has unique keys", () => {
    const keys = ACHIEVEMENT_CATALOG.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has a check function for every catalog entry", () => {
    for (const achievement of ACHIEVEMENT_CATALOG) {
      expect(ACHIEVEMENT_CHECKS[achievement.key]).toBeTypeOf("function");
    }
  });

  it("covers every category and rarity at least once", () => {
    const categories = new Set(ACHIEVEMENT_CATALOG.map((a) => a.category));
    const rarities = new Set(ACHIEVEMENT_CATALOG.map((a) => a.rarity));
    expect(categories).toEqual(new Set(["SOCIAL", "CONTENT", "COMMUNITY", "REFERRAL", "ACTIVITY"]));
    expect(rarities).toEqual(new Set(["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]));
  });
});

describe("ACHIEVEMENT_CHECKS", () => {
  it("nothing unlocks on a zeroed-out context", () => {
    for (const check of Object.values(ACHIEVEMENT_CHECKS)) {
      expect(check(BASE_CONTEXT)).toBe(false);
    }
  });

  it("first_post unlocks at exactly 1 post", () => {
    expect(ACHIEVEMENT_CHECKS.first_post({ ...BASE_CONTEXT, postsCount: 1 })).toBe(true);
  });

  it("recruiter requires 10 referrals, not fewer", () => {
    expect(ACHIEVEMENT_CHECKS.recruiter({ ...BASE_CONTEXT, totalReferrals: 9 })).toBe(false);
    expect(ACHIEVEMENT_CHECKS.recruiter({ ...BASE_CONTEXT, totalReferrals: 10 })).toBe(true);
  });

  it("highly_trusted requires 500 reputation", () => {
    expect(ACHIEVEMENT_CHECKS.highly_trusted({ ...BASE_CONTEXT, reputation: 499 })).toBe(false);
    expect(ACHIEVEMENT_CHECKS.highly_trusted({ ...BASE_CONTEXT, reputation: 500 })).toBe(true);
  });
});
