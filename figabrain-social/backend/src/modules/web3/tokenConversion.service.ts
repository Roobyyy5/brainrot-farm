import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { TokenEngine } from "./tokenEngine.js";
import { UnimplementedChainProvider } from "./chainProvider.js";
import { FGB_CONVERSION_RATE, MIN_CONVERSION_POINTS } from "./tokenConversion.config.js";

const tokenEngine = new TokenEngine(new UnimplementedChainProvider("SOLANA"));

/**
 * Simulates converting Brain Points into FGB tokens: spends the points,
 * credits the off-chain wallet ledger, and logs a TokenConversionRequest for
 * audit/analytics. No real blockchain transaction is ever issued from here.
 */
export async function simulateTokenConversion(userId: string, brainPointsAmount: number) {
  if (brainPointsAmount < MIN_CONVERSION_POINTS) {
    throw new HttpError(400, `Minimum conversion is ${MIN_CONVERSION_POINTS} Brain Points`, "BELOW_MINIMUM");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (Number(user.brainPoints) < brainPointsAmount) {
    throw new HttpError(400, "Insufficient Brain Points", "INSUFFICIENT_BALANCE");
  }

  const fgbAmount = brainPointsAmount * FGB_CONVERSION_RATE;

  const request = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { brainPoints: { decrement: brainPointsAmount } } });
    const created = await tx.tokenConversionRequest.create({
      data: {
        userId,
        brainPointsSpent: new Prisma.Decimal(brainPointsAmount),
        fgbTokenAmount: new Prisma.Decimal(fgbAmount),
        rate: new Prisma.Decimal(FGB_CONVERSION_RATE),
      },
    });
    await tx.economyLog.create({
      data: { userId, type: "TOKEN_CONVERSION", amount: new Prisma.Decimal(-brainPointsAmount), metadata: { fgbAmount } },
    });
    return created;
  });

  await tokenEngine.creditOffChain(userId, fgbAmount);

  return { ...request, brainPointsSpent: Number(request.brainPointsSpent), fgbTokenAmount: Number(request.fgbTokenAmount), rate: Number(request.rate) };
}

export async function getConversionHistory(userId: string) {
  const rows = await prisma.tokenConversionRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  return rows.map((r) => ({ ...r, brainPointsSpent: Number(r.brainPointsSpent), fgbTokenAmount: Number(r.fgbTokenAmount), rate: Number(r.rate) }));
}
