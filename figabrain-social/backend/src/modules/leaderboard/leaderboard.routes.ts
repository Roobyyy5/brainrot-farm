import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { validateQuery } from "../../middleware/validate.js";
import * as redis from "../../lib/redis.js";

export const leaderboardRouter = Router();

const querySchema = z.object({
  period: z.enum(["alltime", "weekly", "daily"]).default("alltime"),
});

function cacheKey(period: string) {
  return `leaderboard:${period}`;
}

function periodStart(period: string): Date | undefined {
  if (period === "daily") return new Date(Date.now() - 86_400_000);
  if (period === "weekly") return new Date(Date.now() - 7 * 86_400_000);
  return undefined;
}

leaderboardRouter.get(
  "/",
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { period } = req.query as unknown as { period: "alltime" | "weekly" | "daily" };
    const key = cacheKey(period);
    const CACHE_TTL = period === "alltime" ? 60 : 120;

    const cached = await redis.get(key);
    if (cached) {
      return res.json({ data: JSON.parse(cached), cached: true });
    }

    const since = periodStart(period);

    let data: { position: number; username: string; displayName: string | null; avatarUrl: string | null; rank: string; brainPoints: number }[];

    if (period === "alltime") {
      const topUsers = await prisma.user.findMany({
        where: { isBanned: false, isShadowBanned: false },
        orderBy: { brainPoints: "desc" },
        take: 100,
        select: { username: true, displayName: true, avatarUrl: true, rank: true, brainPoints: true },
      });
      data = topUsers.map((u, i) => ({ position: i + 1, ...u, brainPoints: Number(u.brainPoints) }));
    } else {
      // For period leaderboards, sum reward ledger entries in the time window
      const grouped = await prisma.rewardLedgerEntry.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 100,
      });

      const userIds = grouped.map((g) => g.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isBanned: false, isShadowBanned: false },
        select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      data = grouped
        .filter((g) => userMap.has(g.userId))
        .map((g, i) => ({
          position: i + 1,
          ...userMap.get(g.userId)!,
          brainPoints: Number(g._sum.amount ?? 0),
        }));
    }

    await redis.setex(key, CACHE_TTL, JSON.stringify(data));
    res.json({ data });
  })
);
