import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { STREAK_MILESTONES, STREAK_MILESTONE_BONUS } from "../../config/levelConfig.js";

/**
 * Persists a new daily-login streak value, tracks the all-time best, and
 * pays out the one-time milestone bonus (1/3/7/14/30/90/365 days) the first
 * time a streak cycle reaches it. `didReset` marks a cycle boundary so the
 * same milestone can be re-earned on a future streak.
 */
export async function applyStreakUpdate(userId: string, newStreak: number, didReset: boolean): Promise<void> {
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { longestStreak: true, streakCycle: true },
  });
  const longestStreak = Math.max(current.longestStreak, newStreak);
  const streakCycle = didReset ? current.streakCycle + 1 : current.streakCycle;

  await prisma.user.update({ where: { id: userId }, data: { loginStreak: newStreak, longestStreak, streakCycle } });

  if (!STREAK_MILESTONES.includes(newStreak as (typeof STREAK_MILESTONES)[number])) return;
  const bonus = STREAK_MILESTONE_BONUS[newStreak];
  if (!bonus) return;

  try {
    await prisma.streakMilestoneClaim.create({ data: { userId, milestone: newStreak, streakCycle } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { brainPoints: { increment: bonus.points }, xp: { increment: bonus.xp } },
  });
  await prisma.economyLog.create({
    data: { userId, type: "STREAK_MILESTONE", amount: bonus.points, metadata: { milestone: newStreak, xpBonus: bonus.xp } },
  });
}

export async function getStreakStatus(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { loginStreak: true, longestStreak: true },
  });
  const nextMilestone = STREAK_MILESTONES.find((m) => m > user.loginStreak) ?? null;
  return { currentStreak: user.loginStreak, longestStreak: user.longestStreak, nextMilestone };
}
