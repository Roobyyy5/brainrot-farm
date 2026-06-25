import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { optionalAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { getActiveSeason, getSeasonLeaderboard } from "./seasons.service.js";

export const seasonsRouter = Router();

seasonsRouter.get(
  "/current",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const season = await getActiveSeason();
    if (!season) {
      res.json({ data: null });
      return;
    }

    const leaderboard = await getSeasonLeaderboard(season.id, 100);
    const myParticipant = req.user
      ? await prisma.seasonParticipant.findUnique({
          where: { seasonId_userId: { seasonId: season.id, userId: req.user.id } },
        })
      : null;

    res.json({
      data: {
        season,
        leaderboard,
        me: myParticipant
          ? { seasonPoints: Number(myParticipant.seasonPoints), seasonXp: myParticipant.seasonXp }
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
