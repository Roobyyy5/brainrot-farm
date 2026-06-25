import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getStreakStatus } from "./streaks.service.js";

export const streaksRouter = Router();

streaksRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await getStreakStatus(req.user!.id) });
  })
);
