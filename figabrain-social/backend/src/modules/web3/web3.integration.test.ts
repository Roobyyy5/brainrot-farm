import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { StakingEngine } from "./stakingEngine.js";
import { simulateTokenConversion, getConversionHistory } from "./tokenConversion.service.js";
import { AirdropEngine } from "./airdropEngine.js";
import { MIN_CONVERSION_POINTS, FGB_CONVERSION_RATE } from "./tokenConversion.config.js";

/**
 * Integration tests for all three Web3 engines. Runs against the real DB
 * configured via DATABASE_URL. Creates its own throwaway data and cleans up.
 */

// ─── shared fixtures ────────────────────────────────────────────────────────

let userId: string;
let poolId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      telegramId: `web3_test_${Date.now()}`,
      username: `web3tester_${Date.now()}`,
      displayName: "Web3 Test User",
      brainPoints: 10_000,
      lastLoginAt: new Date(),
    },
  });
  userId = user.id;

  await prisma.wallet.create({
    data: {
      userId,
      address: `0xtest_${Date.now()}`,
      publicKey: "testpubkey",
      encryptedPrivateKey: "enc",
      encryptionIv: "iv",
      encryptionAuthTag: "tag",
      tokenBalance: 0,
    },
  });

  const pool = await prisma.stakingPool.create({
    data: {
      name: `Test Pool ${Date.now()}`,
      apr: 12,
      lockDays: 0, // 0-day lock so we can immediately close in tests
      minAmount: 10,
    },
  });
  poolId = pool.id;
});

afterAll(async () => {
  await prisma.stakingPosition.deleteMany({ where: { userId } });
  await prisma.tokenConversionRequest.deleteMany({ where: { userId } });
  await prisma.wallet.deleteMany({ where: { userId } });
  await prisma.stakingPool.delete({ where: { id: poolId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

// ─── StakingEngine ───────────────────────────────────────────────────────────

describe("StakingEngine", () => {
  const engine = new StakingEngine();
  let positionId: string;

  it("rejects amounts below the pool minimum", async () => {
    await expect(engine.open(userId, poolId, 5)).rejects.toThrow("Minimum stake");
  });

  it("opens a staking position", async () => {
    const position = await engine.open(userId, poolId, 100);
    positionId = position.id;
    expect(position.status).toBe("ACTIVE");
    expect(Number(position.amount)).toBe(100);
    expect(position.userId).toBe(userId);
  });

  it("rejects closing a position that is still locked", async () => {
    // Create a position with a multi-day lock that cannot be closed yet.
    const lockedPool = await prisma.stakingPool.create({
      data: { name: `Locked ${Date.now()}`, apr: 5, lockDays: 30, minAmount: 1 },
    });
    const locked = await engine.open(userId, lockedPool.id, 1);
    await expect(engine.close(locked.id, userId)).rejects.toThrow("still locked");
    await prisma.stakingPosition.delete({ where: { id: locked.id } });
    await prisma.stakingPool.delete({ where: { id: lockedPool.id } });
  });

  it("rejects closing a position owned by another user", async () => {
    const other = await prisma.user.create({
      data: {
        telegramId: `other_web3_${Date.now()}`,
        username: `otherweb3_${Date.now()}`,
        displayName: "Other",
      },
    });
    await expect(engine.close(positionId, other.id)).rejects.toThrow("Not the owner");
    await prisma.user.delete({ where: { id: other.id } });
  });

  it("closes the position and credits a Decimal payout to the wallet", async () => {
    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    await engine.close(positionId, userId);
    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { userId } });

    // APR 12%, lockDays 0 → near-zero interest; payout ≥ principal
    expect(Number(walletAfter.tokenBalance)).toBeGreaterThanOrEqual(100);

    const position = await prisma.stakingPosition.findUniqueOrThrow({ where: { id: positionId } });
    expect(position.status).toBe("CLOSED");
    expect(position.closedAt).not.toBeNull();

    // Payout should be stored with Decimal precision, not floating-point noise.
    const rawPayout = Number(walletAfter.tokenBalance) - Number(walletBefore.tokenBalance);
    const decimalPlaces = rawPayout.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(10);
  });

  it("refuses to re-close an already-closed position", async () => {
    await expect(engine.close(positionId, userId)).rejects.toThrow("not active");
  });
});

// ─── simulateTokenConversion ─────────────────────────────────────────────────

describe("simulateTokenConversion", () => {
  it("throws when below minimum conversion threshold", async () => {
    await expect(simulateTokenConversion(userId, MIN_CONVERSION_POINTS - 1)).rejects.toMatchObject({
      code: "BELOW_MINIMUM",
    });
  });

  it("throws when user has insufficient Brain Points", async () => {
    await expect(simulateTokenConversion(userId, 999_999)).rejects.toMatchObject({
      code: "INSUFFICIENT_BALANCE",
    });
  });

  it("atomically debits BP and credits token balance", async () => {
    const userBefore = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { userId } });

    const amount = 500;
    const result = await simulateTokenConversion(userId, amount);

    const userAfter = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { userId } });

    // BP reduced
    expect(Number(userAfter.brainPoints)).toBe(Number(userBefore.brainPoints) - amount);
    // Token balance increased
    const expectedFgb = amount * FGB_CONVERSION_RATE;
    expect(Number(walletAfter.tokenBalance) - Number(walletBefore.tokenBalance)).toBeCloseTo(expectedFgb, 6);
    // Audit record exists
    expect(result.brainPointsSpent).toBe(amount);
    expect(result.fgbTokenAmount).toBeCloseTo(expectedFgb, 6);
  });

  it("records the conversion in history", async () => {
    const history = await getConversionHistory(userId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].userId).toBe(userId);
  });
});

// ─── AirdropEngine ───────────────────────────────────────────────────────────

describe("AirdropEngine", () => {
  const engine = new AirdropEngine();
  let campaignId: string;

  it("creates a campaign with one claimable entry per eligible user", async () => {
    const campaign = await engine.createCampaign({
      name: `Test Airdrop ${Date.now()}`,
      totalAmount: 1000,
      perUserAmount: 10,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86_400_000),
      eligibleUserIds: [userId],
    });
    campaignId = campaign.id;

    const claim = await prisma.airdropClaim.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    expect(claim).not.toBeNull();
    expect(claim?.status).toBe("CLAIMABLE");
    expect(Number(claim?.amount)).toBe(10);
  });

  it("marks the claim as CLAIMED", async () => {
    await engine.claim(campaignId, userId);
    const claim = await prisma.airdropClaim.findUniqueOrThrow({
      where: { campaignId_userId: { campaignId, userId } },
    });
    expect(claim.status).toBe("CLAIMED");
    expect(claim.claimedAt).not.toBeNull();
  });

  it("rejects a double-claim", async () => {
    await expect(engine.claim(campaignId, userId)).rejects.toThrow("not claimable");
  });

  afterAll(async () => {
    await prisma.airdropClaim.deleteMany({ where: { campaignId } });
    await prisma.airdropCampaign.delete({ where: { id: campaignId } }).catch(() => {});
  });
});
