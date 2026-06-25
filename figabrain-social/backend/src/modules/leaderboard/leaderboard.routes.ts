import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

export const leaderboardRouter = Router();

leaderboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const topUsers = await prisma.user.findMany({
      where: { isBanned: false, isShadowBanned: false },
      orderBy: { brainPoints: "desc" },
      take: 100,
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        rank: true,
        brainPoints: true,
      },
    });

    res.json({
      data: topUsers.map((u, index) => ({
        position: index + 1,
        ...u,
        brainPoints: Number(u.brainPoints),
      })),
    });
  })
);
