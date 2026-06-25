import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listActiveBoosters } from "./boosters.service.js";

export const boostersRouter = Router();

boostersRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const active = await listActiveBoosters(req.user!.id);
    res.json({ data: active });
  })
);
