import type { Rank } from "@prisma/client";

export interface LevelTier {
  rank: Rank;
  minXp: number;
  multiplier: number;
}

/**
 * XP thresholds and the Brain Points/XP reward multiplier unlocked at each
 * rank. Ordered highest-to-lowest so computeRank/rankMultiplier can return on
 * the first tier the user's XP clears.
 */
export const LEVEL_TIERS: LevelTier[] = [
  { rank: "NEURAL_GOD", minXp: 30000, multiplier: 5 },
  { rank: "GALAXY_BRAIN", minXp: 12000, multiplier: 4 },
  { rank: "MEME_EMPEROR", minXp: 5000, multiplier: 3 },
  { rank: "BRAIN_LORD", minXp: 2000, multiplier: 2 },
  { rank: "GIGACHAD", minXp: 750, multiplier: 1.5 },
  { rank: "SIGMA", minXp: 200, multiplier: 1.2 },
  { rank: "NORMIE", minXp: 50, multiplier: 1 },
  { rank: "NPC", minXp: 0, multiplier: 1 },
];

export function computeRank(xp: number): Rank {
  for (const tier of LEVEL_TIERS) {
    if (xp >= tier.minXp) return tier.rank;
  }
  return "NPC";
}

export function rankMultiplier(rank: Rank): number {
  return LEVEL_TIERS.find((t) => t.rank === rank)?.multiplier ?? 1;
}

export function nextLevelTier(xp: number): LevelTier | null {
  const ascending = [...LEVEL_TIERS].reverse();
  for (const tier of ascending) {
    if (xp < tier.minXp) return tier;
  }
  return null;
}

export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 90, 365] as const;

export const STREAK_MILESTONE_BONUS: Record<number, { xp: number; points: number }> = {
  1: { xp: 5, points: 2 },
  3: { xp: 15, points: 8 },
  7: { xp: 40, points: 25 },
  14: { xp: 90, points: 60 },
  30: { xp: 200, points: 150 },
  90: { xp: 600, points: 500 },
  365: { xp: 3000, points: 3000 },
};
