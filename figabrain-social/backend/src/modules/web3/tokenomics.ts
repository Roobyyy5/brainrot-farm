/**
 * FIGABRAIN Token (FGB) — Production-ready tokenomics engine.
 *
 * Fully off-chain simulation; no real blockchain transactions are executed.
 * All values are configurable at runtime via the TOKENOMICS_CONFIG object.
 * The architecture is designed to plug in real on-chain settlement when
 * ChainProvider.transfer() is wired to an actual network.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { writeAuditLog } from "../../utils/logger.js";

// ── Supply constants ────────────────────────────────────────────────────────

export const TOKENOMICS_CONFIG = {
  /** Total FGB token supply */
  TOTAL_SUPPLY: 1_000_000_000,

  /** Allocation percentages (must sum to 100) */
  ALLOCATIONS: {
    REWARDS_RESERVE:    30,   // Brain Points conversion & social rewards
    COMMUNITY_AIRDROP:  15,   // Airdrop campaigns
    TEAM_VESTING:       15,   // Team tokens with 4-year vesting
    ECOSYSTEM:          15,   // Grants, partnerships
    TREASURY:           10,   // Protocol treasury
    LIQUIDITY:          10,   // DEX liquidity provision
    PUBLIC_SALE:         5,   // TGE public sale
  },

  /** Vesting schedules (months) */
  VESTING: {
    TEAM: {
      cliffMonths:   12,   // 1-year cliff
      vestingMonths: 48,   // 4-year linear vesting
    },
    ECOSYSTEM: {
      cliffMonths:   6,
      vestingMonths: 24,
    },
    PUBLIC_SALE: {
      cliffMonths:   0,    // No cliff for public sale
      vestingMonths: 12,   // 12-month linear unlock
    },
  },

  /** Brain Points → FGB conversion rate */
  BP_TO_FGB_RATE: 0.001,    // 1 BP = 0.001 FGB
  MIN_CONVERSION_BP: 100,   // Minimum 100 BP per conversion

  /** Staking APR per pool (annual %) */
  STAKING_POOLS: [
    { name: "Flexible",   lockDays: 0,   apr: 8  },
    { name: "30-Day",     lockDays: 30,  apr: 15 },
    { name: "90-Day",     lockDays: 90,  apr: 25 },
    { name: "365-Day",    lockDays: 365, apr: 45 },
  ],

  /** Platform fee on staking rewards */
  STAKING_PLATFORM_FEE_PERCENT: 10,
};

// ── Supply tracker ───────────────────────────────────────────────────────────

export function getAllocationBreakdown(): Record<string, number> {
  const total = TOKENOMICS_CONFIG.TOTAL_SUPPLY;
  return Object.fromEntries(
    Object.entries(TOKENOMICS_CONFIG.ALLOCATIONS).map(([k, pct]) => [
      k,
      (pct / 100) * total,
    ])
  );
}

/**
 * Returns how many FGB tokens have been distributed off-chain
 * (sum of all wallet tokenBalance values).
 */
export async function getCirculatingSupply(): Promise<number> {
  const agg = await prisma.wallet.aggregate({ _sum: { tokenBalance: true } });
  return Number(agg._sum.tokenBalance ?? 0);
}

export async function getSupplyMetrics(): Promise<{
  total: number;
  circulating: number;
  locked: number;
  allocationBreakdown: Record<string, number>;
}> {
  const circulating = await getCirculatingSupply();
  const total = TOKENOMICS_CONFIG.TOTAL_SUPPLY;
  return {
    total,
    circulating,
    locked: total - circulating,
    allocationBreakdown: getAllocationBreakdown(),
  };
}

// ── Vesting ─────────────────────────────────────────────────────────────────

export interface VestingSchedule {
  allocationLabel: string;
  totalTokens: number;
  cliffMonths: number;
  vestingMonths: number;
  vestedAt(monthsElapsed: number): number;
}

// Maps VESTING key → ALLOCATIONS key
const VESTING_TO_ALLOC: Record<keyof typeof TOKENOMICS_CONFIG.VESTING, keyof typeof TOKENOMICS_CONFIG.ALLOCATIONS> = {
  TEAM:        "TEAM_VESTING",
  ECOSYSTEM:   "ECOSYSTEM",
  PUBLIC_SALE: "PUBLIC_SALE",
};

export function buildVestingSchedule(
  allocationLabel: keyof typeof TOKENOMICS_CONFIG.VESTING
): VestingSchedule {
  const alloc = TOKENOMICS_CONFIG.ALLOCATIONS;
  const vc = TOKENOMICS_CONFIG.VESTING[allocationLabel];
  const allocKey = VESTING_TO_ALLOC[allocationLabel];
  const totalTokens =
    ((alloc[allocKey] ?? 0) / 100) * TOKENOMICS_CONFIG.TOTAL_SUPPLY;

  return {
    allocationLabel,
    totalTokens,
    cliffMonths: vc.cliffMonths,
    vestingMonths: vc.vestingMonths,
    vestedAt(monthsElapsed: number): number {
      if (monthsElapsed < vc.cliffMonths) return 0;
      const vestingElapsed = monthsElapsed - vc.cliffMonths;
      const fraction = Math.min(vestingElapsed / vc.vestingMonths, 1);
      return totalTokens * fraction;
    },
  };
}

export function getAllVestingSnapshots(monthsElapsed: number): Array<{
  label: string;
  totalTokens: number;
  vestedTokens: number;
  lockedTokens: number;
  percentVested: number;
}> {
  return (
    Object.keys(TOKENOMICS_CONFIG.VESTING) as Array<
      keyof typeof TOKENOMICS_CONFIG.VESTING
    >
  ).map((label) => {
    const schedule = buildVestingSchedule(label);
    const vestedTokens = schedule.vestedAt(monthsElapsed);
    return {
      label,
      totalTokens: schedule.totalTokens,
      vestedTokens: Math.round(vestedTokens),
      lockedTokens: Math.round(schedule.totalTokens - vestedTokens),
      percentVested: schedule.totalTokens
        ? Math.round((vestedTokens / schedule.totalTokens) * 100)
        : 0,
    };
  });
}

// ── Emission / inflation ─────────────────────────────────────────────────────

/**
 * Computes the daily emission from the Rewards Reserve.
 * Designed to be deflationary: emission halves every 2 years.
 */
export function dailyEmissionRate(daysSinceLaunch: number): number {
  const totalRewardsReserve =
    (TOKENOMICS_CONFIG.ALLOCATIONS.REWARDS_RESERVE / 100) *
    TOKENOMICS_CONFIG.TOTAL_SUPPLY;
  // 4-year emission schedule with halvings every 730 days
  const halvings = Math.floor(daysSinceLaunch / 730);
  const baseDaily = totalRewardsReserve / (4 * 365);
  return baseDaily / Math.pow(2, halvings);
}

// ── Rewards reserve tracker ──────────────────────────────────────────────────

export async function getRewardsReserveBalance(): Promise<number> {
  const totalRewarded = await prisma.rewardLedgerEntry.aggregate({
    _sum: { amount: true },
  });
  const initialReserve =
    (TOKENOMICS_CONFIG.ALLOCATIONS.REWARDS_RESERVE / 100) *
    TOKENOMICS_CONFIG.TOTAL_SUPPLY;
  // Each BP reward is worth BP_TO_FGB_RATE FGB from the reserve
  const fgbSpent =
    Number(totalRewarded._sum.amount ?? 0) * TOKENOMICS_CONFIG.BP_TO_FGB_RATE;
  return Math.max(0, initialReserve - fgbSpent);
}

// ── Treasury ─────────────────────────────────────────────────────────────────

export interface TreasuryMetrics {
  allocatedTokens: number;
  description: string;
  usages: string[];
}

export function getTreasuryMetrics(): TreasuryMetrics {
  return {
    allocatedTokens:
      (TOKENOMICS_CONFIG.ALLOCATIONS.TREASURY / 100) *
      TOKENOMICS_CONFIG.TOTAL_SUPPLY,
    description:
      "Protocol treasury managed by governance. Used for protocol development, " +
      "bug bounties, security audits, and emergency reserves.",
    usages: [
      "Protocol development funding",
      "Security audits & bug bounties",
      "Market stabilization reserve",
      "Emergency protocol support",
      "Governance proposals funding",
    ],
  };
}

// ── Liquidity reserve ────────────────────────────────────────────────────────

export interface LiquidityMetrics {
  allocatedTokens: number;
  targetDexPairs: string[];
  description: string;
}

export function getLiquidityMetrics(): LiquidityMetrics {
  return {
    allocatedTokens:
      (TOKENOMICS_CONFIG.ALLOCATIONS.LIQUIDITY / 100) *
      TOKENOMICS_CONFIG.TOTAL_SUPPLY,
    targetDexPairs: ["FGB/SOL", "FGB/USDC", "FGB/BNB"],
    description:
      "Reserved for initial DEX liquidity provision at TGE. " +
      "LP tokens will be locked for 12 months post-launch.",
  };
}

// ── BP → FGB conversion ──────────────────────────────────────────────────────

export function calculateFgbFromBp(brainPoints: number): {
  fgbAmount: number;
  rate: number;
  valid: boolean;
  reason?: string;
} {
  if (brainPoints < TOKENOMICS_CONFIG.MIN_CONVERSION_BP) {
    return {
      fgbAmount: 0,
      rate: TOKENOMICS_CONFIG.BP_TO_FGB_RATE,
      valid: false,
      reason: `Minimum ${TOKENOMICS_CONFIG.MIN_CONVERSION_BP} BP required`,
    };
  }
  return {
    fgbAmount: brainPoints * TOKENOMICS_CONFIG.BP_TO_FGB_RATE,
    rate: TOKENOMICS_CONFIG.BP_TO_FGB_RATE,
    valid: true,
  };
}

// ── Staking yield calculator ─────────────────────────────────────────────────

export function calculateStakingReward(
  principal: number,
  lockDays: number,
  durationDays: number
): { grossReward: number; platformFee: number; netReward: number; apr: number } {
  const pool = TOKENOMICS_CONFIG.STAKING_POOLS.find((p) => p.lockDays === lockDays);
  const apr = pool?.apr ?? 0;
  const grossReward = principal * (apr / 100) * (durationDays / 365);
  const platformFee =
    grossReward * (TOKENOMICS_CONFIG.STAKING_PLATFORM_FEE_PERCENT / 100);
  return {
    grossReward,
    platformFee,
    netReward: grossReward - platformFee,
    apr,
  };
}

// ── Full tokenomics snapshot ─────────────────────────────────────────────────

export async function getFullTokenomicsSnapshot(daysSinceLaunch = 0): Promise<{
  supply: Awaited<ReturnType<typeof getSupplyMetrics>>;
  vesting: ReturnType<typeof getAllVestingSnapshots>;
  dailyEmission: number;
  rewardsReserve: number;
  treasury: TreasuryMetrics;
  liquidity: LiquidityMetrics;
  conversionRate: number;
  stakingPools: typeof TOKENOMICS_CONFIG.STAKING_POOLS;
}> {
  const [supply, rewardsReserve] = await Promise.all([
    getSupplyMetrics(),
    getRewardsReserveBalance(),
  ]);

  return {
    supply,
    vesting: getAllVestingSnapshots(Math.floor(daysSinceLaunch / 30)),
    dailyEmission: dailyEmissionRate(daysSinceLaunch),
    rewardsReserve,
    treasury: getTreasuryMetrics(),
    liquidity: getLiquidityMetrics(),
    conversionRate: TOKENOMICS_CONFIG.BP_TO_FGB_RATE,
    stakingPools: TOKENOMICS_CONFIG.STAKING_POOLS,
  };
}
