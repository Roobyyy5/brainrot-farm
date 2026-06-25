import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import * as redis from "../../lib/redis.js";
import { DEFAULT_REWARD_RULES, type RewardAction } from "../../config/rewardConfig.js";
import { computeRank, rankMultiplier } from "../users/rank.js";
import { getActiveMultiplier } from "../boosters/boosters.service.js";
import { recordMissionProgress } from "../missions/missions.service.js";
import { MISSION_ACTION_BY_REWARD_ACTION } from "../missions/missions.config.js";
import { checkAndGrantAchievements } from "../achievements/achievements.service.js";
import { recordSeasonProgress } from "../seasons/seasons.service.js";
import { evaluateAndAutoShadowBan } from "../antibot/antibot.service.js";

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
  const configCacheKey = `reward:config:${action}`;
  const cachedConfig = await redis.get(configCacheKey);
  let rule: {
    amount: Prisma.Decimal;
    xpAmount: number;
    dailyCap: Prisma.Decimal | null;
    cooldownSeconds: number;
    enabled: boolean;
  };
  if (cachedConfig) {
    const parsed = JSON.parse(cachedConfig);
    rule = {
      amount: new Prisma.Decimal(parsed.amount),
      xpAmount: parsed.xpAmount,
      dailyCap: parsed.dailyCap !== null ? new Prisma.Decimal(parsed.dailyCap) : null,
      cooldownSeconds: parsed.cooldownSeconds,
      enabled: parsed.enabled,
    };
  } else {
    const config = await prisma.rewardConfig.findUnique({ where: { action } });
    rule = config ?? {
      amount: new Prisma.Decimal(DEFAULT_REWARD_RULES[action].amount),
      xpAmount: DEFAULT_REWARD_RULES[action].xpAmount,
      dailyCap: DEFAULT_REWARD_RULES[action].dailyCap
        ? new Prisma.Decimal(DEFAULT_REWARD_RULES[action].dailyCap as number)
        : null,
      cooldownSeconds: DEFAULT_REWARD_RULES[action].cooldownSeconds,
      enabled: true,
    };
    await redis.setex(
      configCacheKey,
      60,
      JSON.stringify({
        amount: rule.amount.toString(),
        xpAmount: rule.xpAmount,
        dailyCap: rule.dailyCap?.toString() ?? null,
        cooldownSeconds: rule.cooldownSeconds,
        enabled: rule.enabled,
      })
    );
  }

  if (!rule.enabled) {
    return { granted: false, amount: 0, xp: 0 };
  }

  if (rule.cooldownSeconds > 0) {
    const cdKey = `reward:cd:${userId}:${action}`;
    const blocked = await redis.exists(cdKey);
    if (blocked) {
      return { granted: false, amount: 0, xp: 0 };
    }
    // Redis miss: fall back to DB to handle restart/eviction edge cases.
    const lastEvent = await prisma.rewardLedgerEntry.findFirst({
      where: { userId, action },
      orderBy: { createdAt: "desc" },
    });
    if (lastEvent) {
      const elapsedMs = Date.now() - lastEvent.createdAt.getTime();
      if (elapsedMs < rule.cooldownSeconds * 1000) {
        const remainingSeconds = Math.ceil((rule.cooldownSeconds * 1000 - elapsedMs) / 1000);
        await redis.setex(cdKey, remainingSeconds, "1");
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

  if (rule.cooldownSeconds > 0) {
    await redis.setex(`reward:cd:${userId}:${action}`, rule.cooldownSeconds, "1");
  }

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
  await evaluateAndAutoShadowBan(userId);

  return { granted: true, amount: Number(amount), xp: xpGained };
}
