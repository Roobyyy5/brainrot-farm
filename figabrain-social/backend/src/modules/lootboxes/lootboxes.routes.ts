import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { listUserLootBoxes, openLootBox } from "./lootboxes.service.js";

export const lootboxesRouter = Router();

lootboxesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const boxes = await listUserLootBoxes(req.user!.id);
    res.json({
      data: boxes.map((b) => ({
        id: b.id,
        lootBox: b.lootBox,
        source: b.source,
        opened: b.opened,
        openedAt: b.openedAt,
        rewardJson: b.rewardJson,
      })),
    });
  })
);

lootboxesRouter.post(
  "/:id/open",
  requireAuth,
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    if (!req.params.id) throw new HttpError(400, "Missing loot box id", "INVALID_REQUEST");
    const result = await openLootBox(req.user!.id, req.params.id);
    res.json({ data: result });
  })
);
