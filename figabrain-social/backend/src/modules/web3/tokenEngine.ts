import { prisma } from "../../lib/prisma.js";
import type { ChainProvider } from "./chainProvider.js";

/**
 * Off-chain ledger for the future FIGABRAIN token. Tracks balances inside
 * Wallet.tokenBalance today; once a ChainProvider is live, `settleOnChain`
 * becomes the single place that turns ledger balances into real transfers.
 */
export class TokenEngine {
  constructor(private readonly provider: ChainProvider) {}

  async creditOffChain(userId: string, amount: number): Promise<void> {
    await prisma.wallet.update({
      where: { userId },
      data: { tokenBalance: { increment: amount } },
    });
  }

  async debitOffChain(userId: string, amount: number): Promise<void> {
    await prisma.wallet.update({
      where: { userId },
      data: { tokenBalance: { decrement: amount } },
    });
  }

  async settleOnChain(userId: string, amount: bigint): Promise<string> {
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    return this.provider.transfer(wallet.address, wallet.address, amount);
  }
}
