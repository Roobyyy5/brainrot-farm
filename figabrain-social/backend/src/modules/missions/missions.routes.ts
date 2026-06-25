import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getMissionsForUser } from "./missions.service.js";

export const missionsRouter = Router();

missionsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const missions = await getMissionsForUser(req.user!.id);
    res.json({
      data: {
        daily: missions.filter((m) => m.period === "DAILY"),
        weekly: missions.filter((m) => m.period === "WEEKLY"),
      },
    });
  })
);
