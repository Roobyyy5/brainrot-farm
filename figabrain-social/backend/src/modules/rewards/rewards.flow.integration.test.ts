import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { grantReward } from "./rewards.service.js";

/**
 * Hits the real database configured via DATABASE_URL (see .env / docker-compose).
 * Creates its own throwaway user + mission/achievement rows so it never depends
 * on `npm run prisma:seed` having run, and cleans everything up afterwards.
 */
describe("grantReward end-to-end", () => {
  let userId: string;
  let missionId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        telegramId: `test_rewards_flow_${Date.now()}`,
        username: `test_rewards_${Date.now()}`,
        displayName: "Reward Flow Test",
      },
    });
    userId = user.id;

    const mission = await prisma.mission.create({
      data: {
        key: `test_mission_${Date.now()}`,
        period: "DAILY",
        action: "LIKE",
        title: "Test mission",
        description: "Created by an automated test",
        targetCount: 1,
        xpReward: 7,
        pointsReward: 3,
      },
    });
    missionId = mission.id;
  });

  afterAll(async () => {
    await prisma.userMission.deleteMany({ where: { userId } });
    await prisma.mission.delete({ where: { id: missionId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  it("grants Brain Points and XP for a fresh action", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const reward = await grantReward(userId, "LIKE", "test-ref");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(reward.granted).toBe(true);
    expect(reward.amount).toBeGreaterThan(0);
    expect(reward.xp).toBeGreaterThan(0);
    expect(Number(after.brainPoints)).toBeGreaterThan(Number(before.brainPoints));
    expect(after.xp).toBeGreaterThan(before.xp);
  });

  it("respects the per-action cooldown on an immediate repeat", async () => {
    // LIKE has a 1s cooldown by default; calling it twice back-to-back must no-op the second time.
    const second = await grantReward(userId, "LIKE", "test-ref-2");
    expect(second.granted).toBe(false);
    expect(second.amount).toBe(0);
  });

  it("completes the matching mission and pays its bonus", async () => {
    const userMission = await prisma.userMission.findFirst({ where: { userId, missionId } });
    expect(userMission?.completed).toBe(true);
    expect(userMission?.progress).toBeGreaterThanOrEqual(1);
  });
});
