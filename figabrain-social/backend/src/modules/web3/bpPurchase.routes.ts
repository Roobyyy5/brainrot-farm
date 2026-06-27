import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAuditLog } from "../../utils/logger.js";

export const bpPurchaseRouter = Router();

// Prices: how many $ per 1000 BP
const BP_PACKAGES = [
  { bpAmount: 500,   usdAmount: 2.99  },
  { bpAmount: 1500,  usdAmount: 7.99  },
  { bpAmount: 5000,  usdAmount: 19.99 },
  { bpAmount: 15000, usdAmount: 49.99 },
];

// Crypto wallets to receive payment (set your real addresses in env or config)
const PAYMENT_ADDRESSES: Record<string, string> = {
  USDT_TRC20: process.env.PAY_USDT_TRC20_ADDRESS ?? "TReplaceWithYourTRC20Address",
  USDT_SOL:   process.env.PAY_USDT_SOL_ADDRESS   ?? "SolReplaceWithYourSolanaAddress",
  TON:        process.env.PAY_TON_ADDRESS         ?? "EQReplaceWithYourTONAddress",
};

bpPurchaseRouter.get(
  "/packages",
  asyncHandler(async (_req, res) => {
    res.json({ data: { packages: BP_PACKAGES, addresses: PAYMENT_ADDRESSES } });
  })
);

bpPurchaseRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const purchases = await prisma.bpPurchase.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ data: purchases.map((p) => ({ ...p, bpAmount: Number(p.bpAmount), usdAmount: Number(p.usdAmount) })) });
  })
);

const initSchema = z.object({
  bpAmount:       z.number().positive(),
  usdAmount:      z.number().positive(),
  cryptoCurrency: z.string().min(1),
});

bpPurchaseRouter.post(
  "/init",
  requireAuth,
  validateBody(initSchema),
  asyncHandler(async (req, res) => {
    const { bpAmount, usdAmount, cryptoCurrency } = req.body as z.infer<typeof initSchema>;
    const address = PAYMENT_ADDRESSES[cryptoCurrency];
    if (!address) throw new HttpError(400, "Unsupported crypto currency");

    const pkg = BP_PACKAGES.find((p) => p.bpAmount === bpAmount && Math.abs(p.usdAmount - usdAmount) < 0.01);
    if (!pkg) throw new HttpError(400, "Invalid package");

    const purchase = await prisma.bpPurchase.create({
      data: {
        userId: req.user!.id,
        bpAmount,
        usdAmount,
        cryptoAddress: address,
        cryptoCurrency,
        status: "PENDING",
      },
    });

    res.status(201).json({
      data: {
        id: purchase.id,
        cryptoAddress: address,
        cryptoCurrency,
        usdAmount: pkg.usdAmount,
        bpAmount: pkg.bpAmount,
      },
    });
  })
);

const submitTxSchema = z.object({ txHash: z.string().min(10) });

bpPurchaseRouter.post(
  "/:id/submit-tx",
  requireAuth,
  validateBody(submitTxSchema),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.bpPurchase.findUniqueOrThrow({ where: { id: req.params.id } });
    if (purchase.userId !== req.user!.id) throw new HttpError(403, "Forbidden");
    if (purchase.status !== "PENDING") throw new HttpError(400, "Purchase is not in PENDING state");

    await prisma.bpPurchase.update({
      where: { id: purchase.id },
      data: { txHash: req.body.txHash, status: "SUBMITTED" },
    });

    res.json({ data: { submitted: true } });
  })
);

// ── Admin endpoints ──

bpPurchaseRouter.get(
  "/admin/pending",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const purchases = await prisma.bpPurchase.findMany({
      where: { status: { in: ["PENDING", "SUBMITTED"] } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { username: true, displayName: true } } },
    });
    res.json({ data: purchases.map((p) => ({ ...p, bpAmount: Number(p.bpAmount), usdAmount: Number(p.usdAmount) })) });
  })
);

const approveSchema = z.object({ adminNote: z.string().optional() });

bpPurchaseRouter.post(
  "/admin/:id/approve",
  requireAuth,
  requireAdmin,
  validateBody(approveSchema),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.bpPurchase.findUniqueOrThrow({ where: { id: req.params.id } });
    if (purchase.status === "APPROVED") throw new HttpError(400, "Already approved");

    await prisma.$transaction([
      prisma.bpPurchase.update({
        where: { id: purchase.id },
        data: { status: "APPROVED", adminNote: req.body.adminNote ?? null },
      }),
      prisma.user.update({
        where: { id: purchase.userId },
        data: { brainPoints: { increment: purchase.bpAmount } },
      }),
    ]);

    await writeAuditLog({
      userId: req.user!.id,
      action: "ADMIN_APPROVE_BP_PURCHASE",
      entity: "BpPurchase",
      entityId: purchase.id,
      metadata: { bpAmount: Number(purchase.bpAmount), usdAmount: Number(purchase.usdAmount) },
    });

    res.json({ data: { approved: true } });
  })
);

bpPurchaseRouter.post(
  "/admin/:id/reject",
  requireAuth,
  requireAdmin,
  validateBody(approveSchema),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.bpPurchase.findUniqueOrThrow({ where: { id: req.params.id } });
    if (purchase.status === "APPROVED") throw new HttpError(400, "Already approved — cannot reject");

    await prisma.bpPurchase.update({
      where: { id: purchase.id },
      data: { status: "REJECTED", adminNote: req.body.adminNote ?? null },
    });

    await writeAuditLog({
      userId: req.user!.id,
      action: "ADMIN_REJECT_BP_PURCHASE",
      entity: "BpPurchase",
      entityId: purchase.id,
    });

    res.json({ data: { rejected: true } });
  })
);
