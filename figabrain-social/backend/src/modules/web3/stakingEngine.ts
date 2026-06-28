import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class StakingEngine {
  async open(userId: string, poolId: string, amount: number) {
    const pool = await prisma.stakingPool.findUniqueOrThrow({ where: { id: poolId } });
    if (amount < Number(pool.minAmount)) {
      throw new Error(`Minimum stake for this pool is ${pool.minAmount}`);
    }

    return prisma.stakingPosition.create({
      data: {
        userId,
        poolId,
        amount,
        unlocksAt: new Date(Date.now() + pool.lockDays * MS_PER_DAY),
      },
    });
  }

  async close(positionId: string, userId: string) {
    const position = await prisma.stakingPosition.findUniqueOrThrow({
      where: { id: positionId },
      include: { pool: true },
    });

    if (position.userId !== userId) throw new Error("Not the owner of this staking position");
    if (position.status !== "ACTIVE") throw new Error(`Position is not active (status: ${position.status})`);
    if (position.unlocksAt > new Date()) throw new Error("Position is still locked");

    const stakedDays = new Prisma.Decimal(Date.now() - position.startedAt.getTime()).div(MS_PER_DAY);
    const apr = position.pool.apr.div(100);
    const grossInterest = position.amount.mul(apr).mul(stakedDays).div(365);

    // Platform fee is taken from the interest only (not principal)
    const feeRate = position.pool.platformFeePercent.div(100);
    const fee = grossInterest.mul(feeRate);
    const netInterest = grossInterest.sub(fee);

    // Round to 10 decimal places to match tokenBalance column precision expectations
    const payout = position.amount.add(netInterest).toDecimalPlaces(10);

    return prisma.$transaction([
      prisma.stakingPosition.update({
        where: { id: position.id },
        data: { status: "CLOSED", closedAt: new Date() },
      }),
      prisma.wallet.update({
        where: { userId },
        data: { tokenBalance: { increment: payout } },
      }),
    ]);
  }
}
