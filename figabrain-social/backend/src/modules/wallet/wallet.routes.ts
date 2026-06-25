import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";

export const walletRouter = Router();

walletRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { brainPoints: true } } },
    });
    if (!wallet) throw new HttpError(404, "Wallet not found", "WALLET_NOT_FOUND");

    res.json({
      data: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        chain: wallet.chain,
        tokenBalance: Number(wallet.tokenBalance),
        brainPoints: Number(wallet.user.brainPoints),
        createdAt: wallet.createdAt,
      },
    });
  })
);
