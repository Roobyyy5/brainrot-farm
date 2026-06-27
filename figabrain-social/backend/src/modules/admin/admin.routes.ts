import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAuditLog } from "../../utils/logger.js";
import { startSeason, endSeason } from "../seasons/seasons.service.js";
import { SEASON_CACHE_KEY } from "../seasons/seasons.routes.js";
import { invalidateBanCache } from "../../middleware/antibot.js";
import * as redis from "../../lib/redis.js";
import { computeSuspiciousScore } from "../antibot/antibot.service.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// ---- User management ----

const adminUsersQuerySchema = z.object({
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { search, cursor, limit } = adminUsersQuerySchema.parse(req.query);
    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ username: { contains: search, mode: "insensitive" } }, { displayName: { contains: search, mode: "insensitive" } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        username: true,
        displayName: true,
        brainPoints: true,
        rank: true,
        isBanned: true,
        isShadowBanned: true,
        isAdmin: true,
        createdAt: true,
      },
    });
    res.json({
      data: users.map((u) => ({ ...u, brainPoints: Number(u.brainPoints) })),
      nextCursor: users.length === limit ? users[users.length - 1]?.id : null,
    });
  })
);

adminRouter.post(
  "/users/:id/ban",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: true } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_BAN_USER", entity: "User", entityId: user.id });
    await invalidateBanCache(req.params.id);
    res.json({ data: { banned: true } });
  })
);

adminRouter.post(
  "/users/:id/unban",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: false } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_UNBAN_USER", entity: "User", entityId: user.id });
    await invalidateBanCache(req.params.id);
    res.json({ data: { banned: false } });
  })
);

adminRouter.post(
  "/users/:id/shadow-ban",
  asyncHandler(async (req, res) => {
    await prisma.shadowBan.upsert({
      where: { userId: req.params.id },
      create: { userId: req.params.id, reason: "manual_admin_action" },
      update: {},
    });
    await prisma.user.update({ where: { id: req.params.id }, data: { isShadowBanned: true } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_SHADOW_BAN", entity: "User", entityId: req.params.id });
    await invalidateBanCache(req.params.id);
    res.json({ data: { shadowBanned: true } });
  })
);

adminRouter.post(
  "/users/:id/shadow-unban",
  asyncHandler(async (req, res) => {
    await prisma.shadowBan.deleteMany({ where: { userId: req.params.id } });
    await prisma.user.update({ where: { id: req.params.id }, data: { isShadowBanned: false } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_SHADOW_UNBAN", entity: "User", entityId: req.params.id });
    await invalidateBanCache(req.params.id);
    res.json({ data: { shadowBanned: false } });
  })
);

// ---- Reward management ----

const rewardConfigSchema = z.object({
  amount: z.number().min(0),
  xpAmount: z.number().min(0).optional(),
  dailyCap: z.number().min(0).nullable().optional(),
  cooldownSeconds: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

adminRouter.put(
  "/reward-config/:action",
  validateBody(rewardConfigSchema),
  asyncHandler(async (req, res) => {
    const config = await prisma.rewardConfig.upsert({
      where: { action: req.params.action },
      create: { action: req.params.action, ...req.body },
      update: req.body,
    });
    await writeAuditLog({
      userId: req.user!.id,
      action: "ADMIN_REWARD_CONFIG_UPDATED",
      entity: "RewardConfig",
      entityId: config.id,
      metadata: req.body,
    });
    res.json({ data: config });
  })
);

// ---- Seasons ----

const startSeasonSchema = z.object({
  name: z.string().min(1).max(100),
  durationDays: z.number().min(1).max(365).default(30),
});

adminRouter.get(
  "/seasons",
  asyncHandler(async (_req, res) => {
    const seasons = await prisma.season.findMany({ orderBy: { startsAt: "desc" }, take: 20 });
    res.json({ data: seasons });
  })
);

adminRouter.post(
  "/seasons",
  validateBody(startSeasonSchema),
  asyncHandler(async (req, res) => {
    const season = await startSeason(req.body.name, req.body.durationDays);
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_SEASON_STARTED", entity: "Season", entityId: season.id });
    // Invalidate the cached season so the new one is served immediately.
    await redis.del(SEASON_CACHE_KEY);
    res.status(201).json({ data: season });
  })
);

adminRouter.post(
  "/seasons/:id/end",
  asyncHandler(async (req, res) => {
    const participantCount = await endSeason(req.params.id);
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_SEASON_ENDED", entity: "Season", entityId: req.params.id, metadata: { participantCount } });
    await redis.del(SEASON_CACHE_KEY);
    res.json({ data: { ended: true, participantCount } });
  })
);

// ---- Content moderation ----

adminRouter.get(
  "/reports",
  asyncHandler(async (_req, res) => {
    const reports = await prisma.report.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { filer: { select: { username: true } } },
    });
    res.json({ data: reports });
  })
);

adminRouter.post(
  "/posts/:id/remove",
  asyncHandler(async (req, res) => {
    const post = await prisma.post.update({ where: { id: req.params.id }, data: { moderation: "REMOVED" } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_REMOVE_POST", entity: "Post", entityId: post.id });
    res.json({ data: { removed: true } });
  })
);

// ---- Analytics dashboard ----

adminRouter.get(
  "/analytics/overview",
  asyncHandler(async (_req, res) => {
    const [userCount, postCount, totalBrainPoints, bannedCount, shadowBannedCount] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.user.aggregate({ _sum: { brainPoints: true } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.shadowBan.count(),
    ]);

    res.json({
      data: {
        userCount,
        postCount,
        totalBrainPointsIssued: Number(totalBrainPoints._sum.brainPoints ?? 0),
        bannedCount,
        shadowBannedCount,
      },
    });
  })
);

// ---- Reward dashboard ----

adminRouter.get(
  "/analytics/rewards",
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const byAction = await prisma.rewardLedgerEntry.groupBy({
      by: ["action"],
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    res.json({
      data: byAction.map((row) => ({
        action: row.action,
        totalAmount: Number(row._sum.amount ?? 0),
        eventCount: row._count._all,
      })),
    });
  })
);

// ---- Economy dashboard ----

adminRouter.get(
  "/analytics/economy",
  asyncHandler(async (_req, res) => {
    const [totalBrainPoints, totalXp, lootBoxesOpened, boostersActivated, tokenConversions, rankDistribution] = await Promise.all([
      prisma.user.aggregate({ _sum: { brainPoints: true } }),
      prisma.user.aggregate({ _sum: { xp: true } }),
      prisma.userLootBox.count({ where: { opened: true } }),
      prisma.userBooster.count(),
      prisma.tokenConversionRequest.aggregate({ _sum: { brainPointsSpent: true, fgbTokenAmount: true }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ["rank"], _count: { _all: true } }),
    ]);

    res.json({
      data: {
        totalBrainPointsInCirculation: Number(totalBrainPoints._sum.brainPoints ?? 0),
        totalXpEarned: totalXp._sum.xp ?? 0,
        lootBoxesOpened,
        boostersActivated,
        tokenConversions: {
          count: tokenConversions._count._all,
          totalBrainPointsConverted: Number(tokenConversions._sum.brainPointsSpent ?? 0),
          totalFgbIssued: Number(tokenConversions._sum.fgbTokenAmount ?? 0),
        },
        rankDistribution: rankDistribution.map((r) => ({ rank: r.rank, count: r._count._all })),
      },
    });
  })
);

// ---- Retention dashboard ----

adminRouter.get(
  "/analytics/retention",
  asyncHandler(async (_req, res) => {
    const now = Date.now();
    const [dau, wau, mau, streakDistribution] = await Promise.all([
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(now - 86_400_000) } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(now - 7 * 86_400_000) } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(now - 30 * 86_400_000) } } }),
      prisma.user.groupBy({ by: ["loginStreak"], _count: { _all: true }, orderBy: { loginStreak: "asc" } }),
    ]);

    res.json({
      data: {
        dailyActiveUsers: dau,
        weeklyActiveUsers: wau,
        monthlyActiveUsers: mau,
        streakDistribution: streakDistribution.map((s) => ({ streak: s.loginStreak, count: s._count._all })),
      },
    });
  })
);

// ---- Engagement dashboard ----

adminRouter.get(
  "/analytics/engagement",
  asyncHandler(async (_req, res) => {
    const [userCount, postCount, commentCount, likeCount, repostCount, missionsCompleted, achievementsUnlocked] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.like.count(),
      prisma.repost.count(),
      prisma.userMission.count({ where: { completed: true } }),
      prisma.userAchievement.count(),
    ]);

    const safeUserCount = Math.max(userCount, 1);

    res.json({
      data: {
        postsPerUser: postCount / safeUserCount,
        commentsPerUser: commentCount / safeUserCount,
        likesPerUser: likeCount / safeUserCount,
        repostsPerUser: repostCount / safeUserCount,
        missionsCompleted,
        achievementsUnlocked,
      },
    });
  })
);

// ---- Fraud detection dashboard ----

adminRouter.get(
  "/fraud/duplicate-devices",
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.user.groupBy({
      by: ["deviceFingerprint"],
      where: { deviceFingerprint: { not: null } },
      _count: { _all: true },
      having: { deviceFingerprint: { _count: { gt: 1 } } },
    });
    res.json({ data: grouped });
  })
);

adminRouter.get(
  "/fraud/suspicious-score/:userId",
  asyncHandler(async (req, res) => {
    res.json({ data: await computeSuspiciousScore(req.params.userId) });
  })
);

adminRouter.get(
  "/fraud/shadow-bans",
  asyncHandler(async (_req, res) => {
    const bans = await prisma.shadowBan.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: bans.map((b) => b.userId) } },
      select: { id: true, username: true },
    });
    const usernameById = new Map(users.map((u) => [u.id, u.username]));
    res.json({
      data: bans.map((b) => ({ ...b, username: usernameById.get(b.userId) ?? null })),
    });
  })
);

const auditLogsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const { cursor, limit } = auditLogsQuerySchema.parse(req.query);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    res.json({
      data: logs,
      nextCursor: logs.length === limit ? logs[logs.length - 1]?.id : null,
    });
  })
);
