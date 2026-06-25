import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getReputationHistory } from "./reputation.service.js";

export const reputationRouter = Router();

reputationRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const history = await getReputationHistory(req.user!.id);
    res.json({ data: { history } });
  })
);
