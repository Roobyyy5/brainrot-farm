import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { simulateTokenConversion, getConversionHistory } from "./tokenConversion.service.js";
import { FGB_CONVERSION_RATE, MIN_CONVERSION_POINTS } from "./tokenConversion.config.js";

export const tokenConversionRouter = Router();

tokenConversionRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: { rate: FGB_CONVERSION_RATE, minPoints: MIN_CONVERSION_POINTS, history: await getConversionHistory(req.user!.id) } });
  })
);

const convertSchema = z.object({ brainPointsAmount: z.number().positive() });

tokenConversionRouter.post(
  "/convert",
  requireAuth,
  writeActionRateLimiter,
  validateBody(convertSchema),
  asyncHandler(async (req, res) => {
    const result = await simulateTokenConversion(req.user!.id, req.body.brainPointsAmount);
    res.status(201).json({ data: result });
  })
);
