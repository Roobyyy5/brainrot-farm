import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

export const rewardsRouter = Router();

rewardsRouter.get(
  "/config",
  asyncHandler(async (_req, res) => {
    const config = await prisma.rewardConfig.findMany({ orderBy: { action: "asc" } });
    res.json({ data: config });
  })
);

rewardsRouter.get(
  "/me/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const entries = await prisma.rewardLedgerEntry.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ data: entries });
  })
);
