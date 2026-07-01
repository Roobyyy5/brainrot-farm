import { prisma } from "../../lib/prisma.js";
import * as redis from "../../lib/redis.js";
import { getActiveMultiplier } from "../boosters/boosters.service.js";
import { recordMissionProgress } from "../missions/missions.service.js";
import { checkAndGrantAchievements } from "../achievements/achievements.service.js";
import { recordSeasonProgress } from "../seasons/seasons.service.js";

const MAX_TAPS_PER_SECOND = 20;
const MAX_OFFLINE_HOURS = 8;
const CRIT_CHANCE = 0.03; // 3% chance per tap batch (cosmetic — server computes normally)
const PRESTIGE_TAP_THRESHOLD = 1_000_000; // 1M total taps to prestige

export const UPGRADE_CONFIGS = {
  TAP_POWER: {
    maxLevel: 5,
    bpCosts: [0, 100, 300, 700, 1500, 3500] as const,
    label: "Tap Power",
    description: "Brain Points earned per tap",
    getEffect: (level: number) => level + 1,
    unit: "BP/tap",
  },
  ENERGY_MAX: {
    maxLevel: 5,
    bpCosts: [0, 200, 500, 1200, 2500, 5000] as const,
    label: "Energy Capacity",
    description: "Maximum energy storage",
    getEffect: (level: number) => 1000 + level * 1000,
    unit: "energy",
  },
  REGEN_RATE: {
    maxLevel: 5,
    bpCosts: [0, 150, 400, 900, 2000, 4500] as const,
    label: "Energy Regen",
    description: "Energy restored per second",
    getEffect: (level: number) => 2 + level * 2,
    unit: "/sec",
  },
  MULTI_TAP: {
    maxLevel: 3,
    bpCosts: [0, 500, 2000, 6000, 0] as const,
    label: "Multi-Tap",
    description: "Energy drained per click",
    getEffect: (level: number) => level + 1,
    unit: "taps/click",
  },
  AUTO_BRAIN: {
    maxLevel: 5,
    bpCosts: [0, 1000, 3000, 8000, 20000, 50000] as const,
    label: "Auto Brain",
    description: "Passive Brain Points per minute (offline too)",
    getEffect: (level: number) => level * 2,
    unit: "BP/min",
  },
} as const;

export type UpgradeType = keyof typeof UPGRADE_CONFIGS;

const UPGRADE_LEVEL_KEY: Record<UpgradeType, "tapPowerLevel" | "energyMaxLevel" | "regenRateLevel" | "multiTapLevel" | "autoBrainLevel"> = {
  TAP_POWER: "tapPowerLevel",
  ENERGY_MAX: "energyMaxLevel",
  REGEN_RATE: "regenRateLevel",
  MULTI_TAP: "multiTapLevel",
  AUTO_BRAIN: "autoBrainLevel",
};

function computeEnergy(stored: number, energyMax: number, regenRate: number, lastEnergyAt: Date): number {
  const elapsedSec = (Date.now() - lastEnergyAt.getTime()) / 1000;
  return Math.min(energyMax, Math.floor(stored + elapsedSec * regenRate));
}

function computeOfflineBP(autoBrainLevel: number, lastSeenAt: Date): number {
  if (autoBrainLevel === 0) return 0;
  const elapsedMin = Math.min(
    (Date.now() - lastSeenAt.getTime()) / 60_000,
    MAX_OFFLINE_HOURS * 60
  );
  if (elapsedMin < 1) return 0;
  const bpPerMin = UPGRADE_CONFIGS.AUTO_BRAIN.getEffect(autoBrainLevel);
  return Math.round(elapsedMin * bpPerMin * 10) / 10;
}

async function getOrCreateProfile(userId: string) {
  let profile = await prisma.tapperProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.tapperProfile.create({ data: { userId } });
  }
  return profile;
}

export async function getTapperState(userId: string) {
  const profile = await getOrCreateProfile(userId);

  const energyMax = UPGRADE_CONFIGS.ENERGY_MAX.getEffect(profile.energyMaxLevel);
  const regenRate = UPGRADE_CONFIGS.REGEN_RATE.getEffect(profile.regenRateLevel);
  const currentEnergy = computeEnergy(profile.energy, energyMax, regenRate, profile.lastEnergyAt);
  const offlineBP = computeOfflineBP(profile.autoBrainLevel, profile.lastSeenAt);

  // Seed daily boss if none active
  await ensureDailyBoss();

  const boss = await prisma.bossFight.findFirst({
    where: { endsAt: { gt: new Date() }, completed: false },
    include: {
      participants: {
        where: { userId },
        select: { damage: true },
      },
    },
    orderBy: { startsAt: "desc" },
  });

  return {
    energy: currentEnergy,
    energyMax,
    regenRate,
    tapPower: UPGRADE_CONFIGS.TAP_POWER.getEffect(profile.tapPowerLevel),
    multiTap: UPGRADE_CONFIGS.MULTI_TAP.getEffect(profile.multiTapLevel),
    autoBrainBpPerMin: UPGRADE_CONFIGS.AUTO_BRAIN.getEffect(profile.autoBrainLevel),
    levels: {
      tapPower: profile.tapPowerLevel,
      energyMax: profile.energyMaxLevel,
      regenRate: profile.regenRateLevel,
      multiTap: profile.multiTapLevel,
      autoBrain: profile.autoBrainLevel,
    },
    totalTaps: profile.totalTaps,
    totalBpEarned: Number(profile.totalBpEarned),
    prestige: profile.prestige,
    skin: profile.skin,
    offlineBP: offlineBP > 0.1 ? offlineBP : 0,
    boss: boss
      ? {
          id: boss.id,
          name: boss.name,
          hp: boss.hp,
          maxHp: boss.maxHp,
          reward: Number(boss.reward),
          endsAt: boss.endsAt,
          myDamage: boss.participants[0]?.damage ?? 0,
        }
      : null,
  };
}

export async function submitTapBatch(userId: string, count: number): Promise<{
  bpEarned: number;
  offlineBP: number;
  energy: number;
  energyMax: number;
  isCrit: boolean;
}> {
  if (count < 1 || count > 10_000) throw new Error("Invalid tap count");

  // Anti-cheat: check rate via Redis
  const batchKey = `tapper:batch:${userId}`;
  const now = Date.now();
  const lastBatchStr = await redis.get(batchKey);

  let maxAllowedClicks = count;
  if (lastBatchStr) {
    const elapsed = (now - parseInt(lastBatchStr, 10)) / 1000;
    maxAllowedClicks = Math.max(1, Math.floor(elapsed * MAX_TAPS_PER_SECOND));
  }

  const profile = await getOrCreateProfile(userId);

  const energyMax = UPGRADE_CONFIGS.ENERGY_MAX.getEffect(profile.energyMaxLevel);
  const regenRate = UPGRADE_CONFIGS.REGEN_RATE.getEffect(profile.regenRateLevel);
  const tapPower = UPGRADE_CONFIGS.TAP_POWER.getEffect(profile.tapPowerLevel);
  const multiTap = UPGRADE_CONFIGS.MULTI_TAP.getEffect(profile.multiTapLevel);

  const currentEnergy = computeEnergy(profile.energy, energyMax, regenRate, profile.lastEnergyAt);

  const effectiveClicks = Math.min(count, maxAllowedClicks);
  const tapsAttempted = effectiveClicks * multiTap;
  const energyUsed = Math.min(tapsAttempted, currentEnergy);

  // Credit offline income
  const offlineBP = computeOfflineBP(profile.autoBrainLevel, profile.lastSeenAt);

  if (energyUsed <= 0 && offlineBP < 0.1) {
    await prisma.tapperProfile.update({
      where: { userId },
      data: { energy: 0, lastEnergyAt: new Date(), lastSeenAt: new Date() },
    });
    return { bpEarned: 0, offlineBP: 0, energy: 0, energyMax, isCrit: false };
  }

  const boosterMul = await getActiveMultiplier(userId, "BRAIN_POINTS_MULTIPLIER");
  const isCrit = energyUsed > 0 && Math.random() < CRIT_CHANCE;
  const critMul = isCrit ? 10 : 1;

  const tapBP = Math.round(energyUsed * tapPower * boosterMul * critMul * 100) / 100;
  const totalBpCredit = tapBP + offlineBP;
  const newEnergy = currentEnergy - energyUsed;

  const [updatedProfile] = await prisma.$transaction([
    prisma.tapperProfile.update({
      where: { userId },
      data: {
        energy: newEnergy,
        lastEnergyAt: new Date(),
        lastSeenAt: new Date(),
        totalTaps: { increment: energyUsed },
        totalBpEarned: { increment: totalBpCredit },
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        brainPoints: { increment: totalBpCredit },
        xp: { increment: Math.ceil(totalBpCredit) },
      },
    }),
    prisma.tapBatch.create({
      data: {
        userId,
        tapperProfileId: profile.id,
        tapCount: energyUsed,
        bpEarned: totalBpCredit,
      },
    }),
  ]);

  // Check prestige eligibility
  if (updatedProfile.totalTaps >= PRESTIGE_TAP_THRESHOLD && updatedProfile.prestige === 0) {
    // Auto-prestige flag — user must confirm via POST /tapper/prestige
  }

  await redis.setex(batchKey, 120, String(now));

  // Side effects (non-blocking)
  recordMissionProgress(userId, "TAP").catch(() => {});
  checkAndGrantAchievements(userId).catch(() => {});
  recordSeasonProgress(userId, totalBpCredit, Math.ceil(totalBpCredit)).catch(() => {});

  return { bpEarned: tapBP, offlineBP, energy: newEnergy, energyMax, isCrit };
}

export async function buyUpgrade(userId: string, upgradeType: UpgradeType): Promise<void> {
  const config = UPGRADE_CONFIGS[upgradeType];
  const levelKey = UPGRADE_LEVEL_KEY[upgradeType];

  const [profile, user] = await Promise.all([
    getOrCreateProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { brainPoints: true } }),
  ]);

  const currentLevel = profile[levelKey];
  if (currentLevel >= config.maxLevel) throw new Error("Already at max level");

  const cost = config.bpCosts[currentLevel + 1];
  if (Number(user.brainPoints) < cost) throw new Error("Insufficient Brain Points");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { brainPoints: { decrement: cost } } }),
    prisma.tapperProfile.update({ where: { userId }, data: { [levelKey]: { increment: 1 } } }),
  ]);
}

export async function prestigeTapper(userId: string): Promise<void> {
  const profile = await getOrCreateProfile(userId);
  if (profile.totalTaps < PRESTIGE_TAP_THRESHOLD) {
    throw new Error(`Need ${PRESTIGE_TAP_THRESHOLD.toLocaleString()} total taps to prestige`);
  }

  // Reset upgrades, keep totalTaps and prestige count
  await prisma.tapperProfile.update({
    where: { userId },
    data: {
      energy: 1000,
      lastEnergyAt: new Date(),
      tapPowerLevel: 0,
      energyMaxLevel: 0,
      regenRateLevel: 0,
      multiTapLevel: 0,
      autoBrainLevel: 0,
      prestige: { increment: 1 },
    },
  });
}

export async function getTapperLeaderboard() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [allTime, daily] = await Promise.all([
    prisma.tapperProfile.findMany({
      where: { totalTaps: { gt: 0 } },
      orderBy: { totalTaps: "desc" },
      take: 20,
      select: {
        totalTaps: true,
        prestige: true,
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true } },
      },
    }),
    prisma.tapBatch.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: today } },
      _sum: { tapCount: true },
      orderBy: { _sum: { tapCount: "desc" } },
      take: 20,
    }),
  ]);

  const dailyUserIds = daily.map((d) => d.userId);
  const dailyUsers = await prisma.user.findMany({
    where: { id: { in: dailyUserIds } },
    select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true },
  });
  const dailyUserMap = Object.fromEntries(dailyUsers.map((u) => [u.id, u]));

  return {
    allTime: allTime.map((p, i) => ({
      rank: i + 1,
      user: p.user,
      totalTaps: p.totalTaps,
      prestige: p.prestige,
    })),
    daily: daily.map((d, i) => ({
      rank: i + 1,
      user: dailyUserMap[d.userId],
      tapsToday: d._sum.tapCount ?? 0,
    })),
  };
}

export async function getBossLeaderboard(bossId: string) {
  return prisma.bossParticipant.findMany({
    where: { bossId },
    orderBy: { damage: "desc" },
    take: 20,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true } },
    },
  });
}

export async function tapBoss(userId: string, bossId: string, tapCount: number): Promise<{ damage: number; killed: boolean; reward: number }> {
  if (tapCount < 1 || tapCount > 5000) throw new Error("Invalid tap count");

  const boss = await prisma.bossFight.findUnique({ where: { id: bossId } });
  if (!boss || boss.completed || new Date() > boss.endsAt) {
    throw new Error("Boss fight not active");
  }

  const profile = await getOrCreateProfile(userId);
  const tapPower = UPGRADE_CONFIGS.TAP_POWER.getEffect(profile.tapPowerLevel);
  const energyMax = UPGRADE_CONFIGS.ENERGY_MAX.getEffect(profile.energyMaxLevel);
  const regenRate = UPGRADE_CONFIGS.REGEN_RATE.getEffect(profile.regenRateLevel);
  const currentEnergy = computeEnergy(profile.energy, energyMax, regenRate, profile.lastEnergyAt);

  const energyUsed = Math.min(tapCount, currentEnergy);
  if (energyUsed === 0) throw new Error("No energy");

  const damage = energyUsed * tapPower;
  const newBossHp = Math.max(0, boss.hp - damage);
  const killed = newBossHp === 0;

  await prisma.$transaction([
    prisma.bossFight.update({
      where: { id: bossId },
      data: { hp: newBossHp, completed: killed },
    }),
    prisma.bossParticipant.upsert({
      where: { bossId_userId: { bossId, userId } },
      create: { bossId, userId, damage },
      update: { damage: { increment: damage } },
    }),
    prisma.tapperProfile.update({
      where: { userId },
      data: {
        energy: currentEnergy - energyUsed,
        lastEnergyAt: new Date(),
        lastSeenAt: new Date(),
        totalTaps: { increment: energyUsed },
      },
    }),
  ]);

  let reward = 0;
  if (killed) {
    // Reward all participants proportionally
    const participants = await prisma.bossParticipant.findMany({
      where: { bossId, rewarded: false },
    });
    const totalDamage = participants.reduce((s, p) => s + p.damage, 0);
    const bossReward = Number(boss.reward);

    await Promise.all(
      participants.map((p) => {
        const share = Math.round((p.damage / totalDamage) * bossReward * 100) / 100;
        return prisma.$transaction([
          prisma.user.update({ where: { id: p.userId }, data: { brainPoints: { increment: share } } }),
          prisma.bossParticipant.update({ where: { id: p.id }, data: { rewarded: true } }),
        ]);
      })
    );

    reward = Math.round(((energyUsed) / Math.max(totalDamage, 1)) * bossReward * 100) / 100;
  }

  return { damage, killed, reward };
}

async function ensureDailyBoss() {
  const existing = await prisma.bossFight.findFirst({
    where: { endsAt: { gt: new Date() }, completed: false },
  });
  if (existing) return;

  const bossNames = [
    "Mega Brain",
    "Crypto Kraken",
    "FOMO Phantom",
    "Whale Boss",
    "Moon Titan",
    "Degen Dragon",
  ];
  const name = bossNames[Math.floor(Math.random() * bossNames.length)];
  const now = new Date();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await prisma.bossFight.create({
    data: {
      name,
      hp: 100_000,
      maxHp: 100_000,
      reward: 500,
      startsAt: now,
      endsAt,
    },
  }).catch(() => {}); // ignore race condition on multiple requests
}

export function getUpgradeList(levels: {
  tapPowerLevel: number;
  energyMaxLevel: number;
  regenRateLevel: number;
  multiTapLevel: number;
  autoBrainLevel: number;
}) {
  return (Object.keys(UPGRADE_CONFIGS) as UpgradeType[]).map((type) => {
    const config = UPGRADE_CONFIGS[type];
    const levelKey = UPGRADE_LEVEL_KEY[type];
    const currentLevel = levels[levelKey];
    const nextLevel = currentLevel + 1;
    const isMaxed = currentLevel >= config.maxLevel;

    return {
      type,
      label: config.label,
      description: config.description,
      unit: config.unit,
      currentLevel,
      maxLevel: config.maxLevel,
      currentEffect: config.getEffect(currentLevel),
      nextEffect: isMaxed ? null : config.getEffect(nextLevel),
      cost: isMaxed ? null : config.bpCosts[nextLevel],
      isMaxed,
    };
  });
}
