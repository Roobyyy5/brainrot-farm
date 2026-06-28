import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import {
  getFullTokenomicsSnapshot,
  getAllVestingSnapshots,
  getSupplyMetrics,
  calculateFgbFromBp,
  calculateStakingReward,
  TOKENOMICS_CONFIG,
} from "./tokenomics.js";

export const tokenomicsRouter = Router();

/** GET /api/tokenomics — public snapshot */
tokenomicsRouter.get("/", async (req, res, next) => {
  try {
    const days = Number(req.query.daysSinceLaunch ?? 0);
    const snapshot = await getFullTokenomicsSnapshot(isNaN(days) ? 0 : days);
    res.json({ data: snapshot });
  } catch (err) {
    next(err);
  }
});

/** GET /api/tokenomics/supply — current supply metrics */
tokenomicsRouter.get("/supply", async (_req, res, next) => {
  try {
    const metrics = await getSupplyMetrics();
    res.json({ data: metrics });
  } catch (err) {
    next(err);
  }
});

/** GET /api/tokenomics/vesting?months=N — vesting schedules */
tokenomicsRouter.get("/vesting", async (req, res, next) => {
  try {
    const months = Number(req.query.months ?? 0);
    const schedules = getAllVestingSnapshots(isNaN(months) ? 0 : months);
    res.json({ data: schedules });
  } catch (err) {
    next(err);
  }
});

/** GET /api/tokenomics/convert?bp=N — preview BP→FGB conversion */
tokenomicsRouter.get("/convert", requireAuth, async (req, res, next) => {
  try {
    const bp = Number(req.query.bp ?? 0);
    if (isNaN(bp) || bp < 0) {
      res.status(400).json({ error: "bp must be a non-negative number" });
      return;
    }
    res.json({ data: calculateFgbFromBp(bp) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/tokenomics/staking-preview?amount=N&lockDays=N&durationDays=N */
tokenomicsRouter.get("/staking-preview", requireAuth, async (req, res, next) => {
  try {
    const amount     = Number(req.query.amount ?? 0);
    const lockDays   = Number(req.query.lockDays ?? 0);
    const durationDays = Number(req.query.durationDays ?? lockDays);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: "amount must be positive" });
      return;
    }
    const preview = calculateStakingReward(amount, lockDays, durationDays);
    res.json({ data: preview });
  } catch (err) {
    next(err);
  }
});

/** GET /api/tokenomics/config — admin: full raw config */
tokenomicsRouter.get("/config", requireAuth, requireAdmin, (_req, res) => {
  res.json({ data: TOKENOMICS_CONFIG });
});
