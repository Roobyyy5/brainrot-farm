import type { MissionAction, MissionPeriod } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { periodKeyFor } from "./missions.config.js";

/** Creates (idempotently) the current period's UserMission rows for every active mission, so progress has somewhere to land. */
export async function ensureAssignedMissions(userId: string, period?: MissionPeriod): Promise<void> {
  const missions = await prisma.mission.findMany({
    where: { active: true, ...(period ? { period } : {}) },
  });

  await Promise.all(
    missions.map((mission) =>
      prisma.userMission.upsert({
        where: { userId_missionId_periodKey: { userId, missionId: mission.id, periodKey: periodKeyFor(mission.period) } },
        create: { userId, missionId: mission.id, periodKey: periodKeyFor(mission.period) },
        update: {},
      })
    )
  );
}

export interface MissionView {
  missionId: string;
  key: string;
  period: MissionPeriod;
  title: string;
  description: string;
  targetCount: number;
  progress: number;
  completed: boolean;
  xpReward: number;
  pointsReward: number;
}

export async function getMissionsForUser(userId: string): Promise<MissionView[]> {
  await ensureAssignedMissions(userId);

  const rows = await prisma.userMission.findMany({
    where: {
      userId,
      periodKey: { in: [periodKeyFor("DAILY"), periodKeyFor("WEEKLY")] },
    },
    include: { mission: true },
  });

  return rows
    .filter((r) => r.mission.active)
    .map((r) => ({
      missionId: r.missionId,
      key: r.mission.key,
      period: r.mission.period,
      title: r.mission.title,
      description: r.mission.description,
      targetCount: r.mission.targetCount,
      progress: r.progress,
      completed: r.completed,
      xpReward: r.mission.xpReward,
      pointsReward: Number(r.mission.pointsReward),
    }));
}

/**
 * Bumps progress on every active mission tracking `action` for the current
 * daily/weekly period, granting the mission's reward exactly once the first
 * time progress crosses its target.
 */
export async function recordMissionProgress(userId: string, action: MissionAction): Promise<void> {
  const missions = await prisma.mission.findMany({ where: { active: true, action } });

  for (const mission of missions) {
    const periodKey = periodKeyFor(mission.period);
    const userMission = await prisma.userMission.upsert({
      where: { userId_missionId_periodKey: { userId, missionId: mission.id, periodKey } },
      create: { userId, missionId: mission.id, periodKey },
      update: {},
    });

    if (userMission.completed) continue;

    const progress = userMission.progress + 1;
    const justCompleted = progress >= mission.targetCount;

    await prisma.userMission.update({
      where: { id: userMission.id },
      data: {
        progress,
        completed: justCompleted,
        completedAt: justCompleted ? new Date() : undefined,
      },
    });

    if (justCompleted) {
      await prisma.user.update({
        where: { id: userId },
        data: { brainPoints: { increment: mission.pointsReward }, xp: { increment: mission.xpReward } },
      });
      await prisma.economyLog.create({
        data: {
          userId,
          type: "MISSION_COMPLETED",
          amount: mission.pointsReward,
          metadata: { missionKey: mission.key, xpReward: mission.xpReward },
        },
      });
    }
  }
}
