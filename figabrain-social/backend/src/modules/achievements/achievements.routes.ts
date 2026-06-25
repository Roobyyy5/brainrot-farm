import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getUserAchievements } from "./achievements.service.js";

export const achievementsRouter = Router();

achievementsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await getUserAchievements(req.user!.id) });
  })
);
