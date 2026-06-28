import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { createNotification } from "../../utils/createNotification.js";
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
    await createNotification({
      recipient: { connect: { id: userId } },
      type: "REWARD",
      message: `Досягнення розблоковано: ${achievement.icon} ${achievement.name}`,
    });

    newlyUnlocked.push(achievement);
  }

  return newlyUnlocked;
}

const ACHIEVEMENT_PROGRESS: Record<string, (ctx: AchievementContext) => { value: number; max: number }> = {
  first_post:        (c) => ({ value: Math.min(c.postsCount, 1), max: 1 }),
  prolific_poster:   (c) => ({ value: Math.min(c.postsCount, 50), max: 50 }),
  content_legend:    (c) => ({ value: Math.min(c.postsCount, 500), max: 500 }),
  first_like:        (c) => ({ value: Math.min(c.likesGiven, 1), max: 1 }),
  social_butterfly:  (c) => ({ value: Math.min(c.likesGiven, 100), max: 100 }),
  commentator:       (c) => ({ value: Math.min(c.commentsCount, 25), max: 25 }),
  debate_champion:   (c) => ({ value: Math.min(c.commentsCount, 250), max: 250 }),
  week_streak:       (c) => ({ value: Math.min(c.loginStreak, 7), max: 7 }),
  month_streak:      (c) => ({ value: Math.min(c.loginStreak, 30), max: 30 }),
  year_streak:       (c) => ({ value: Math.min(c.loginStreak, 365), max: 365 }),
  networker:         (c) => ({ value: Math.min(c.totalReferrals, 1), max: 1 }),
  recruiter:         (c) => ({ value: Math.min(c.totalReferrals, 10), max: 10 }),
  community_pillar:  (c) => ({ value: Math.min(c.totalReferrals, 50), max: 50 }),
  reputable:         (c) => ({ value: Math.min(c.reputation, 100), max: 100 }),
  highly_trusted:    (c) => ({ value: Math.min(c.reputation, 500), max: 500 }),
};

export async function getUserAchievements(userId: string) {
  const [unlocked, catalog] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    prisma.achievement.findMany(),
  ]);
  const unlockedByKey = new Map(unlocked.map((u) => [u.achievement.key, u.unlockedAt]));
  const ctx = await buildContext(userId);

  return catalog.map((a) => {
    const prog = ACHIEVEMENT_PROGRESS[a.key]?.(ctx);
    return {
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
      progressValue: prog?.value ?? null,
      progressMax: prog?.max ?? null,
    };
  });
}
