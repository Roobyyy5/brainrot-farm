import { prisma } from "../../lib/prisma.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Off-chain staking bookkeeping: locks a user's tracked balance for
 * `pool.lockDays` and computes simple-interest APR payout on close. No
 * tokens actually move until a ChainProvider exists; this models the
 * product behavior so the UI and reward math are ready in advance.
 */
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

    if (position.userId !== userId) {
      throw new Error("Not the owner of this staking position");
    }
    if (position.status !== "ACTIVE") {
      throw new Error(`Position is not active (status: ${position.status})`);
    }
    if (position.unlocksAt > new Date()) {
      throw new Error("Position is still locked");
    }

    const stakedDays = (Date.now() - position.startedAt.getTime()) / MS_PER_DAY;
    const apr = Number(position.pool.apr) / 100;
    const payout = Number(position.amount) * (1 + apr * (stakedDays / 365));

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
