import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import * as redis from "../../lib/redis.js";

export const leaderboardRouter = Router();

const CACHE_KEY = "leaderboard:top100";
const CACHE_TTL = 60;

leaderboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return res.json({ data: JSON.parse(cached), cached: true });
    }

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

    const data = topUsers.map((u, index) => ({
      position: index + 1,
      ...u,
      brainPoints: Number(u.brainPoints),
    }));

    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data));
    res.json({ data });
  })
);
