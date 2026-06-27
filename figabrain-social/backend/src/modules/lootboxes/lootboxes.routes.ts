import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeActionRateLimiter } from "../../middleware/rateLimit.js";
import { listUserLootBoxes, openLootBox } from "./lootboxes.service.js";

const LOOTBOX_PRICES: Record<string, number> = {
  COMMON:    50,
  RARE:      150,
  EPIC:      350,
  LEGENDARY: 750,
  MYTHIC:    2000,
};

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

const buySchema = z.object({ lootBoxKey: z.string().min(1) });

lootboxesRouter.post(
  "/buy",
  requireAuth,
  writeActionRateLimiter,
  validateBody(buySchema),
  asyncHandler(async (req, res) => {
    const lootBox = await prisma.lootBox.findUnique({ where: { key: req.body.lootBoxKey } });
    if (!lootBox) throw new HttpError(404, "Loot box not found", "LOOTBOX_NOT_FOUND");

    const price = LOOTBOX_PRICES[lootBox.rarity] ?? 9999;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (Number(user.brainPoints) < price) {
      throw new HttpError(402, `Insufficient Brain Points. Required: ${price} BP`, "INSUFFICIENT_BP");
    }

    const userLootBox = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.user!.id }, data: { brainPoints: { decrement: price } } });
      await tx.economyLog.create({
        data: { userId: req.user!.id, type: "LOOTBOX_PURCHASED", amount: -price, metadata: { lootBoxKey: req.body.lootBoxKey } },
      });
      return tx.userLootBox.create({ data: { userId: req.user!.id, lootBoxId: lootBox.id, source: "purchase" } });
    });

    res.status(201).json({ data: { userLootBox, priceSpent: price } });
  })
);

lootboxesRouter.get(
  "/shop",
  asyncHandler(async (_req, res) => {
    const boxes = await prisma.lootBox.findMany({ orderBy: { rarity: "asc" } });
    res.json({
      data: boxes.map((b) => ({ ...b, price: LOOTBOX_PRICES[b.rarity] ?? 9999 })),
    });
  })
);
