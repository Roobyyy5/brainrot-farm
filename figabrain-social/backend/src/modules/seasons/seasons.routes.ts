import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { getActiveSeason, getSeasonLeaderboard, seasonRewardBP } from "./seasons.service.js";
import * as redis from "../../lib/redis.js";

export const seasonsRouter = Router();

const SEASON_CACHE_KEY = "seasons:current:public";
const SEASON_CACHE_TTL = 60;

seasonsRouter.get(
  "/current",
  optionalAuth,
  asyncHandler(async (req, res) => {
    // Cache the public (non-user-specific) part: season metadata + leaderboard.
    let publicData: { season: { id: string; [key: string]: unknown }; leaderboard: unknown[] } | null = null;

    const cached = await redis.get(SEASON_CACHE_KEY);
    if (cached) {
      publicData = JSON.parse(cached);
    } else {
      const season = await getActiveSeason();
      if (!season) {
        res.json({ data: null });
        return;
      }
      const leaderboard = await getSeasonLeaderboard(season.id, 100);
      publicData = { season, leaderboard };
      await redis.setex(SEASON_CACHE_KEY, SEASON_CACHE_TTL, JSON.stringify(publicData));
    }

    if (!publicData) {
      res.json({ data: null });
      return;
    }

    // User-specific data is always fetched fresh (not cached).
    const myParticipant = req.user
      ? await prisma.seasonParticipant.findUnique({
          where: { seasonId_userId: { seasonId: publicData.season.id, userId: req.user.id } },
        })
      : null;

    res.json({
      data: {
        ...publicData,
        me: myParticipant
          ? {
              seasonPoints: Number(myParticipant.seasonPoints),
              seasonXp: myParticipant.seasonXp,
              finalRank: myParticipant.finalRank,
              rewardClaimed: myParticipant.rewardClaimed,
            }
          : null,
      },
    });
  })
);

seasonsRouter.get(
  "/:id/leaderboard",
  asyncHandler(async (req, res) => {
    const season = await prisma.season.findUnique({ where: { id: req.params.id } });
    if (!season) throw new HttpError(404, "Season not found", "SEASON_NOT_FOUND");
    res.json({ data: await getSeasonLeaderboard(season.id, 100) });
  })
);

/** Claim the BP reward for a finished season. Idempotency is enforced via the
 *  rewardClaimed flag — concurrent requests are safe because the update is
 *  gated on rewardClaimed = false inside a transaction. */
seasonsRouter.post(
  "/:id/claim",
  requireAuth,
  asyncHandler(async (req, res) => {
    const season = await prisma.season.findUnique({ where: { id: req.params.id } });
    if (!season) throw new HttpError(404, "Season not found", "SEASON_NOT_FOUND");
    if (season.status !== "ENDED") throw new HttpError(409, "Season has not ended yet", "SEASON_NOT_ENDED");

    const participant = await prisma.seasonParticipant.findUnique({
      where: { seasonId_userId: { seasonId: season.id, userId: req.user!.id } },
    });
    if (!participant) throw new HttpError(404, "You did not participate in this season", "NOT_PARTICIPANT");
    if (participant.rewardClaimed) throw new HttpError(409, "Reward already claimed", "ALREADY_CLAIMED");
    if (participant.finalRank === null) throw new HttpError(409, "Final ranks not yet assigned", "RANKS_NOT_FINALIZED");

    const bpReward = seasonRewardBP(participant.finalRank);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.seasonParticipant.updateMany({
        where: { id: participant.id, rewardClaimed: false },
        data: { rewardClaimed: true },
      });
      // If another concurrent request already claimed, updated.count is 0.
      if (updated.count === 0) throw new HttpError(409, "Reward already claimed", "ALREADY_CLAIMED");

      await tx.user.update({
        where: { id: req.user!.id },
        data: { brainPoints: { increment: bpReward } },
      });
      await tx.economyLog.create({
        data: {
          userId: req.user!.id,
          type: "SEASON_REWARD",
          amount: bpReward,
          metadata: { seasonId: season.id, finalRank: participant.finalRank },
        },
      });
    });

    res.json({ data: { claimed: true, bpReward, finalRank: participant.finalRank } });
  })
);

export { SEASON_CACHE_KEY };
