import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { validateQuery } from "../../middleware/validate.js";

export const notificationsRouter = Router();

const notificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

notificationsRouter.get(
  "/",
  requireAuth,
  validateQuery(notificationsQuerySchema),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { actor: { select: { username: true, displayName: true, avatarUrl: true } } },
    });
    res.json({
      data: notifications,
      nextCursor: notifications.length === limit ? notifications[notifications.length - 1]?.id : null,
    });
  })
);

notificationsRouter.get(
  "/unread-count",
  requireAuth,
  asyncHandler(async (req, res) => {
    const unread = await prisma.notification.count({
      where: { recipientId: req.user!.id, isRead: false },
    });
    res.json({ data: { unread } });
  })
);

notificationsRouter.post(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { recipientId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ data: { read: true } });
  })
);

notificationsRouter.post(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, recipientId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ data: { read: true } });
  })
);
