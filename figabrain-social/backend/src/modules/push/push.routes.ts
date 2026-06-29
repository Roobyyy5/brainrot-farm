import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { prisma } from "../../lib/prisma.js";
import { getVapidPublicKey } from "../../lib/webpush.js";

export const pushRouter = Router();

// Публічний ключ для клієнта
pushRouter.get("/vapid-public-key", (_req, res) => {
  const key = getVapidPublicKey();
  res.json({ data: { key } });
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

pushRouter.post(
  "/subscribe",
  requireAuth,
  validateBody(subscribeSchema),
  asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body as z.infer<typeof subscribeSchema>;
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: req.user!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: req.user!.id, p256dh: keys.p256dh, auth: keys.auth },
    });
    res.json({ data: { subscribed: true } });
  })
);

pushRouter.delete(
  "/subscribe",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body as { endpoint?: string };
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.id } });
    }
    res.json({ data: { unsubscribed: true } });
  })
);
