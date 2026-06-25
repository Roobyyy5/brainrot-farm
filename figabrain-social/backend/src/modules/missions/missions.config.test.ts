import { describe, expect, it } from "vitest";
import { MISSION_CATALOG, MISSION_ACTION_BY_REWARD_ACTION, periodKeyFor } from "./missions.config.js";

describe("periodKeyFor", () => {
  it("formats DAILY as an ISO calendar date", () => {
    const date = new Date("2026-06-25T15:30:00Z");
    expect(periodKeyFor("DAILY", date)).toBe("2026-06-25");
  });

  it("is stable across same-day timestamps", () => {
    const morning = new Date("2026-06-25T01:00:00Z");
    const night = new Date("2026-06-25T23:59:00Z");
    expect(periodKeyFor("DAILY", morning)).toBe(periodKeyFor("DAILY", night));
  });

  it("formats WEEKLY as an ISO week key and changes week-to-week", () => {
    const week1 = periodKeyFor("WEEKLY", new Date("2026-06-22T00:00:00Z"));
    const week2 = periodKeyFor("WEEKLY", new Date("2026-06-29T00:00:00Z"));
    expect(week1).toMatch(/^\d{4}-W\d{2}$/);
    expect(week1).not.toBe(week2);
  });

  it("keeps the same WEEKLY key for every day inside one ISO week", () => {
    const monday = periodKeyFor("WEEKLY", new Date("2026-06-22T00:00:00Z"));
    const sunday = periodKeyFor("WEEKLY", new Date("2026-06-28T23:00:00Z"));
    expect(monday).toBe(sunday);
  });
});

describe("MISSION_CATALOG", () => {
  it("has unique keys", () => {
    const keys = MISSION_CATALOG.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("only references actions present in MISSION_ACTION_BY_REWARD_ACTION's values", () => {
    const trackedActions = new Set(Object.values(MISSION_ACTION_BY_REWARD_ACTION));
    for (const mission of MISSION_CATALOG) {
      expect(trackedActions.has(mission.action)).toBe(true);
    }
  });

  it("gives every mission a positive target and reward", () => {
    for (const mission of MISSION_CATALOG) {
      expect(mission.targetCount).toBeGreaterThan(0);
      expect(mission.xpReward).toBeGreaterThan(0);
      expect(mission.pointsReward).toBeGreaterThan(0);
    }
  });
});
