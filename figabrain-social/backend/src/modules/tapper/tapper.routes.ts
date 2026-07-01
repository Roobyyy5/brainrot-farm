import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import {
  getTapperState,
  submitTapBatch,
  buyUpgrade,
  prestigeTapper,
  getTapperLeaderboard,
  getBossLeaderboard,
  tapBoss,
  getUpgradeList,
  UPGRADE_CONFIGS,
  type UpgradeType,
} from "./tapper.service.js";

export const tapperRouter = Router();

tapperRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const state = await getTapperState(req.user!.id);
    res.json({ data: state });
  })
);

tapperRouter.post(
  "/tap",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { count } = z.object({ count: z.number().int().min(1).max(10_000) }).parse(req.body);
    const result = await submitTapBatch(req.user!.id, count);
    res.json({ data: result });
  })
);

tapperRouter.get(
  "/upgrades",
  requireAuth,
  asyncHandler(async (req, res) => {
    const state = await getTapperState(req.user!.id);
    const upgrades = getUpgradeList({
      tapPowerLevel: state.levels.tapPower,
      energyMaxLevel: state.levels.energyMax,
      regenRateLevel: state.levels.regenRate,
      multiTapLevel: state.levels.multiTap,
      autoBrainLevel: state.levels.autoBrain,
    });
    res.json({ data: upgrades });
  })
);

tapperRouter.post(
  "/upgrade",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type } = z.object({ type: z.enum(Object.keys(UPGRADE_CONFIGS) as [UpgradeType, ...UpgradeType[]]) }).parse(req.body);
    try {
      await buyUpgrade(req.user!.id, type as UpgradeType);
      const state = await getTapperState(req.user!.id);
      res.json({ data: { success: true, state } });
    } catch (e) {
      throw new HttpError(400, (e as Error).message, "UPGRADE_FAILED");
    }
  })
);

tapperRouter.post(
  "/prestige",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      await prestigeTapper(req.user!.id);
      res.json({ data: { success: true } });
    } catch (e) {
      throw new HttpError(400, (e as Error).message, "PRESTIGE_FAILED");
    }
  })
);

tapperRouter.get(
  "/leaderboard",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await getTapperLeaderboard();
    res.json({ data });
  })
);

tapperRouter.get(
  "/boss/:bossId/leaderboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await getBossLeaderboard(req.params.bossId);
    res.json({ data });
  })
);

tapperRouter.post(
  "/boss/tap",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { bossId, count } = z
      .object({ bossId: z.string().uuid(), count: z.number().int().min(1).max(5000) })
      .parse(req.body);
    try {
      const result = await tapBoss(req.user!.id, bossId, count);
      res.json({ data: result });
    } catch (e) {
      throw new HttpError(400, (e as Error).message, "BOSS_TAP_FAILED");
    }
  })
);
