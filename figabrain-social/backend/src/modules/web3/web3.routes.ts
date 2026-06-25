import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { StakingEngine } from "./stakingEngine.js";
import { AirdropEngine } from "./airdropEngine.js";

export const web3Router = Router();

const stakingEngine = new StakingEngine();
const airdropEngine = new AirdropEngine();

web3Router.get(
  "/staking/pools",
  asyncHandler(async (_req, res) => {
    const pools = await prisma.stakingPool.findMany({ orderBy: { apr: "desc" } });
    res.json({ data: pools });
  })
);

web3Router.get(
  "/staking/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const positions = await prisma.stakingPosition.findMany({
      where: { userId: req.user!.id },
      include: { pool: true },
      orderBy: { startedAt: "desc" },
    });
    res.json({ data: positions });
  })
);

const openStakeSchema = z.object({ poolId: z.string().uuid(), amount: z.number().positive() });

web3Router.post(
  "/staking/open",
  requireAuth,
  validateBody(openStakeSchema),
  asyncHandler(async (req, res) => {
    const position = await stakingEngine.open(req.user!.id, req.body.poolId, req.body.amount);
    res.status(201).json({ data: position });
  })
);

web3Router.post(
  "/staking/:id/close",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await stakingEngine.close(req.params.id, req.user!.id);
    res.json({ data: result });
  })
);

web3Router.get(
  "/airdrops/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const claims = await prisma.airdropClaim.findMany({
      where: { userId: req.user!.id },
      include: { campaign: true },
    });
    res.json({ data: claims });
  })
);

web3Router.post(
  "/airdrops/:campaignId/claim",
  requireAuth,
  asyncHandler(async (req, res) => {
    const claim = await airdropEngine.claim(req.params.campaignId, req.user!.id);
    res.json({ data: claim });
  })
);

const createCampaignSchema = z.object({
  name: z.string().min(1),
  totalAmount: z.number().positive(),
  perUserAmount: z.number().positive(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  eligibleUserIds: z.array(z.string().uuid()),
});

web3Router.post(
  "/airdrops",
  requireAuth,
  requireAdmin,
  validateBody(createCampaignSchema),
  asyncHandler(async (req, res) => {
    const campaign = await airdropEngine.createCampaign({
      ...req.body,
      startsAt: new Date(req.body.startsAt),
      endsAt: new Date(req.body.endsAt),
    });
    res.status(201).json({ data: campaign });
  })
);

web3Router.get(
  "/nfts/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const nfts = await prisma.nft.findMany({
      where: { ownerId: req.user!.id },
      include: { collection: true },
    });
    res.json({ data: nfts });
  })
);
