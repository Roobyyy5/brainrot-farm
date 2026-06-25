import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ACHIEVEMENT_CHECKS, type AchievementContext } from "./achievements.config.js";

async function buildContext(userId: string): Promise<AchievementContext> {
  const [postsCount, commentsCount, likesGiven, totalReferrals, user] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.comment.count({ where: { authorId: userId } }),
    prisma.like.count({ where: { userId } }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { loginStreak: true, reputation: true } }),
  ]);
  return { postsCount, commentsCount, likesGiven, totalReferrals, loginStreak: user.loginStreak, reputation: user.reputation };
}

/**
 * Re-evaluates every not-yet-unlocked achievement against the user's live
 * stats and grants the reward for any that newly qualify. Call after any
 * action that could move the needle (post, comment, like, referral, login).
 */
export async function checkAndGrantAchievements(userId: string) {
  const [unlockedRows, catalog] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { key: true } } } }),
    prisma.achievement.findMany(),
  ]);
  const unlockedKeys = new Set(unlockedRows.map((r) => r.achievement.key));
  const candidates = catalog.filter((a) => !unlockedKeys.has(a.key) && ACHIEVEMENT_CHECKS[a.key]);
  if (candidates.length === 0) return [];

  const ctx = await buildContext(userId);
  const newlyUnlocked: typeof catalog = [];

  for (const achievement of candidates) {
    if (!ACHIEVEMENT_CHECKS[achievement.key](ctx)) continue;

    try {
      await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { brainPoints: { increment: achievement.pointsReward }, xp: { increment: achievement.xpReward } },
    });
    await prisma.economyLog.create({
      data: { userId, type: "ACHIEVEMENT_UNLOCKED", amount: achievement.pointsReward, metadata: { key: achievement.key } },
    });
    await prisma.notification.create({
      data: {
        recipientId: userId,
        type: "REWARD",
        message: `Досягнення розблоковано: ${achievement.icon} ${achievement.name}`,
      },
    });

    newlyUnlocked.push(achievement);
  }

  return newlyUnlocked;
}

export async function getUserAchievements(userId: string) {
  const [unlocked, catalog] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    prisma.achievement.findMany(),
  ]);
  const unlockedByKey = new Map(unlocked.map((u) => [u.achievement.key, u.unlockedAt]));

  return catalog.map((a) => ({
    key: a.key,
    name: a.name,
    description: a.description,
    category: a.category,
    rarity: a.rarity,
    icon: a.icon,
    xpReward: a.xpReward,
    pointsReward: Number(a.pointsReward),
    unlocked: unlockedByKey.has(a.key),
    unlockedAt: unlockedByKey.get(a.key) ?? null,
  }));
}
