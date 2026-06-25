import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAuditLog } from "../../utils/logger.js";
import { startSeason, endSeason } from "../seasons/seasons.service.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// ---- User management ----

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ username: { contains: search, mode: "insensitive" } }, { displayName: { contains: search, mode: "insensitive" } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
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
    res.json({ data: users.map((u) => ({ ...u, brainPoints: Number(u.brainPoints) })) });
  })
);

adminRouter.post(
  "/users/:id/ban",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: true } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_BAN_USER", entity: "User", entityId: user.id });
    res.json({ data: { banned: true } });
  })
);

adminRouter.post(
  "/users/:id/unban",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: false } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_UNBAN_USER", entity: "User", entityId: user.id });
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
    res.json({ data: { shadowBanned: true } });
  })
);

adminRouter.post(
  "/users/:id/shadow-unban",
  asyncHandler(async (req, res) => {
    await prisma.shadowBan.deleteMany({ where: { userId: req.params.id } });
    await prisma.user.update({ where: { id: req.params.id }, data: { isShadowBanned: false } });
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_SHADOW_UNBAN", entity: "User", entityId: req.params.id });
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

adminRouter.post(
  "/seasons",
  validateBody(startSeasonSchema),
  asyncHandler(async (req, res) => {
    const season = await startSeason(req.body.name, req.body.durationDays);
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_SEASON_STARTED", entity: "Season", entityId: season.id });
    res.status(201).json({ data: season });
  })
);

adminRouter.post(
  "/seasons/:id/end",
  asyncHandler(async (req, res) => {
    const participantCount = await endSeason(req.params.id);
    await writeAuditLog({ userId: req.user!.id, action: "ADMIN_SEASON_ENDED", entity: "Season", entityId: req.params.id, metadata: { participantCount } });
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

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    res.json({ data: logs });
  })
);
