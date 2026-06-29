import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { prisma } from "../../lib/prisma.js";
import { sendSupportEmail } from "../../lib/mailer.js";

export const supportRouter = Router();

const supportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Забагато запитів. Спробуй через годину.", code: "RATE_LIMITED" },
});

const contactSchema = z.object({
  subject: z.string().min(3).max(120).trim(),
  message: z.string().min(10).max(3000).trim(),
});

supportRouter.post(
  "/contact",
  requireAuth,
  supportRateLimiter,
  validateBody(contactSchema),
  asyncHandler(async (req, res) => {
    const { subject, message } = req.body as z.infer<typeof contactSchema>;
    const userId = (req as any).user?.id as string;
    if (!userId) throw new HttpError(401, "Unauthorized", "UNAUTHENTICATED");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });
    if (!user) throw new HttpError(404, "User not found", "NOT_FOUND");

    await sendSupportEmail({
      fromUsername: user.username,
      fromEmail: user.email ?? null,
      subject,
      message,
    });

    res.json({ data: { sent: true } });
  })
);
