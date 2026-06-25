import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { DEFAULT_REWARD_RULES, type RewardAction } from "../../config/rewardConfig.js";
import { computeRank, rankMultiplier } from "../users/rank.js";
import { getActiveMultiplier } from "../boosters/boosters.service.js";
import { recordMissionProgress } from "../missions/missions.service.js";
import { MISSION_ACTION_BY_REWARD_ACTION } from "../missions/missions.config.js";
import { checkAndGrantAchievements } from "../achievements/achievements.service.js";
import { recordSeasonProgress } from "../seasons/seasons.service.js";

export class RewardAbuseError extends Error {
  constructor(message: string, public reason: string) {
    super(message);
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Grants Brain Points for a given action, enforcing the per-action cooldown
 * and daily cap from RewardConfig. Returns null (no-op, not an error) when
 * the action is disabled, on cooldown, or has hit its daily cap — callers
 * should treat the underlying social action (like/comment/...) as
 * successful regardless, since rewards are a bonus, not a gate.
 */
export async function grantReward(
  userId: string,
  action: RewardAction,
  refId?: string,
  metadata?: Record<string, unknown>
): Promise<{ granted: boolean; amount: number; xp: number }> {
  const config = await prisma.rewardConfig.findUnique({ where: { action } });
  const rule = config ?? {
    amount: new Prisma.Decimal(DEFAULT_REWARD_RULES[action].amount),
    xpAmount: DEFAULT_REWARD_RULES[action].xpAmount,
    dailyCap: DEFAULT_REWARD_RULES[action].dailyCap
      ? new Prisma.Decimal(DEFAULT_REWARD_RULES[action].dailyCap as number)
      : null,
    cooldownSeconds: DEFAULT_REWARD_RULES[action].cooldownSeconds,
    enabled: true,
  };

  if (!rule.enabled) {
    return { granted: false, amount: 0, xp: 0 };
  }

  if (rule.cooldownSeconds > 0) {
    const lastEvent = await prisma.rewardLedgerEntry.findFirst({
      where: { userId, action },
      orderBy: { createdAt: "desc" },
    });
    if (lastEvent) {
      const elapsedMs = Date.now() - lastEvent.createdAt.getTime();
      if (elapsedMs < rule.cooldownSeconds * 1000) {
        return { granted: false, amount: 0, xp: 0 };
      }
    }
  }

  if (rule.dailyCap !== null) {
    const earnedToday = await prisma.rewardLedgerEntry.aggregate({
      where: { userId, action, createdAt: { gte: startOfDay(new Date()) } },
      _sum: { amount: true },
    });
    const earned = earnedToday._sum.amount ?? new Prisma.Decimal(0);
    if (earned.greaterThanOrEqualTo(rule.dailyCap)) {
      return { granted: false, amount: 0, xp: 0 };
    }
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { rank: true } });
  const [pointsMultiplier, xpMultiplier] = await Promise.all([
    getActiveMultiplier(userId, "BRAIN_POINTS_MULTIPLIER"),
    getActiveMultiplier(userId, "XP_MULTIPLIER"),
  ]);
  const amount = rule.amount.mul(rankMultiplier(user.rank)).mul(pointsMultiplier);
  const xpGained = Math.round(rule.xpAmount * xpMultiplier);

  const [, updatedUser] = await prisma.$transaction([
    prisma.rewardLedgerEntry.create({
      data: { userId, action, amount, refId, metadata: metadata as Prisma.InputJsonValue | undefined },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { brainPoints: { increment: amount }, xp: { increment: xpGained } },
    }),
  ]);

  const newRank = computeRank(updatedUser.xp);
  if (newRank !== updatedUser.rank) {
    await prisma.user.update({ where: { id: userId }, data: { rank: newRank } });
    await prisma.economyLog.create({
      data: { userId, type: "RANK_UP", metadata: { from: updatedUser.rank, to: newRank } },
    });
  }

  const missionAction = MISSION_ACTION_BY_REWARD_ACTION[action];
  if (missionAction) {
    await recordMissionProgress(userId, missionAction);
  }

  await checkAndGrantAchievements(userId);
  await recordSeasonProgress(userId, amount, xpGained);

  return { granted: true, amount: Number(amount), xp: xpGained };
}

/**
 * Reward-abuse heuristic: more than 60 reward-earning events for one user
 * within a 5-minute window is far outside organic usage patterns and is
 * flagged for review rather than silently rewarded.
 */
export async function detectRewardAbuse(userId: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
  const count = await prisma.rewardLedgerEntry.count({
    where: { userId, createdAt: { gte: fiveMinutesAgo } },
  });
  return count > 60;
}
