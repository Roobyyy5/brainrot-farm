import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { writeAuditLog } from "../../utils/logger.js";
import type { ChainProvider } from "./chainProvider.js";

export interface OffChainTransferResult {
  userId: string;
  newBalance: Prisma.Decimal;
}

/**
 * Off-chain ledger for the FIGABRAIN (FGB) token.
 * All balances live in Wallet.tokenBalance until on-chain settlement is enabled.
 * settleOnChain() is the single integration point for future blockchain transfers.
 */
export class TokenEngine {
  constructor(private readonly provider: ChainProvider) {}

  async creditOffChain(userId: string, amount: number): Promise<OffChainTransferResult> {
    if (amount <= 0) throw new Error("credit amount must be positive");
    const wallet = await prisma.wallet.update({
      where: { userId },
      data: { tokenBalance: { increment: amount } },
      select: { tokenBalance: true },
    });
    await writeAuditLog({
      userId,
      action: "TOKEN_CREDIT",
      entity: "Wallet",
      entityId: userId,
      metadata: { amount, newBalance: wallet.tokenBalance.toString() },
    });
    return { userId, newBalance: wallet.tokenBalance };
  }

  async debitOffChain(userId: string, amount: number): Promise<OffChainTransferResult> {
    if (amount <= 0) throw new Error("debit amount must be positive");
    const current = await prisma.wallet.findUniqueOrThrow({
      where: { userId },
      select: { tokenBalance: true },
    });
    if (current.tokenBalance.lessThan(amount)) {
      throw new Error(`Insufficient token balance: ${current.tokenBalance} < ${amount}`);
    }
    const wallet = await prisma.wallet.update({
      where: { userId },
      data: { tokenBalance: { decrement: amount } },
      select: { tokenBalance: true },
    });
    await writeAuditLog({
      userId,
      action: "TOKEN_DEBIT",
      entity: "Wallet",
      entityId: userId,
      metadata: { amount, newBalance: wallet.tokenBalance.toString() },
    });
    return { userId, newBalance: wallet.tokenBalance };
  }

  /**
   * Settle the off-chain balance to the actual on-chain address.
   * The treasury/admin address (provider's signer) sends tokens to the user wallet.
   * This is called ONLY when on-chain transfers are enabled.
   */
  async settleOnChain(userId: string, treasuryAddress: string, amount: bigint): Promise<string> {
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId },
      select: { address: true, tokenBalance: true },
    });
    if (wallet.tokenBalance.lessThan(amount.toString())) {
      throw new Error("Off-chain balance insufficient for on-chain settlement");
    }
    const txHash = await this.provider.transfer(treasuryAddress, wallet.address, amount);
    // Deduct from off-chain ledger after successful on-chain tx
    await prisma.wallet.update({
      where: { userId },
      data: { tokenBalance: { decrement: amount.toString() } },
    });
    await writeAuditLog({
      userId,
      action: "TOKEN_SETTLED_ON_CHAIN",
      entity: "Wallet",
      entityId: userId,
      metadata: { amount: amount.toString(), txHash, toAddress: wallet.address },
    });
    return txHash;
  }

  async getBalance(userId: string): Promise<Prisma.Decimal> {
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId },
      select: { tokenBalance: true },
    });
    return wallet.tokenBalance;
  }
}
