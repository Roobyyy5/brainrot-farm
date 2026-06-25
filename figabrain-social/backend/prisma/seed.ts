import { PrismaClient } from "@prisma/client";
import { DEFAULT_REWARD_RULES } from "../src/config/rewardConfig.js";
import { generateWallet } from "../src/lib/wallet.js";
import { MISSION_CATALOG } from "../src/modules/missions/missions.config.js";
import { ACHIEVEMENT_CATALOG } from "../src/modules/achievements/achievements.config.js";

const prisma = new PrismaClient();

async function seedRewardConfig() {
  for (const rule of Object.values(DEFAULT_REWARD_RULES)) {
    await prisma.rewardConfig.upsert({
      where: { action: rule.action },
      create: {
        action: rule.action,
        amount: rule.amount,
        xpAmount: rule.xpAmount,
        dailyCap: rule.dailyCap,
        cooldownSeconds: rule.cooldownSeconds,
      },
      update: {},
    });
  }
}

async function seedStakingPools() {
  await prisma.stakingPool.createMany({
    data: [
      { name: "Sprout Pool", apr: 4.5, lockDays: 7, minAmount: 10 },
      { name: "Farmer Pool", apr: 9, lockDays: 30, minAmount: 50 },
      { name: "Brainlord Pool", apr: 18, lockDays: 90, minAmount: 200 },
    ],
    skipDuplicates: true,
  });
}

async function seedMissions() {
  for (const mission of MISSION_CATALOG) {
    await prisma.mission.upsert({
      where: { key: mission.key },
      create: mission,
      update: mission,
    });
  }
}

async function seedAchievements() {
  for (const achievement of ACHIEVEMENT_CATALOG) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      create: achievement,
      update: achievement,
    });
  }
}

async function seedBoosters() {
  await prisma.booster.createMany({
    data: [
      { key: "points_2x_1h", name: "2x Brain Points (1h)", type: "BRAIN_POINTS_MULTIPLIER", multiplier: 2, durationSeconds: 3600, rarity: "RARE" },
      { key: "xp_3x_30m", name: "3x XP (30m)", type: "XP_MULTIPLIER", multiplier: 3, durationSeconds: 1800, rarity: "EPIC" },
      { key: "referral_boost_24h", name: "Referral Booster (24h)", type: "REFERRAL_BOOST", multiplier: 2, durationSeconds: 86400, rarity: "LEGENDARY" },
      { key: "points_1_5x_1h", name: "1.5x Brain Points (1h)", type: "BRAIN_POINTS_MULTIPLIER", multiplier: 1.5, durationSeconds: 3600, rarity: "COMMON" },
    ],
    skipDuplicates: true,
  });
}

async function seedLootBoxes() {
  await prisma.lootBox.createMany({
    data: [
      { key: "common_box", name: "Common Loot Box", rarity: "COMMON", pointsMin: 2, pointsMax: 10, xpMin: 5, xpMax: 15, boosterChance: 0.05 },
      { key: "rare_box", name: "Rare Loot Box", rarity: "RARE", pointsMin: 10, pointsMax: 40, xpMin: 15, xpMax: 50, boosterChance: 0.15 },
      { key: "epic_box", name: "Epic Loot Box", rarity: "EPIC", pointsMin: 40, pointsMax: 120, xpMin: 50, xpMax: 150, boosterChance: 0.3 },
      { key: "legendary_box", name: "Legendary Loot Box", rarity: "LEGENDARY", pointsMin: 120, pointsMax: 400, xpMin: 150, xpMax: 500, boosterChance: 0.5 },
      { key: "mythic_box", name: "Mythic Loot Box", rarity: "MYTHIC", pointsMin: 400, pointsMax: 1500, xpMin: 500, xpMax: 2000, boosterChance: 0.8 },
    ],
    skipDuplicates: true,
  });
}

async function seedSeason() {
  const existing = await prisma.season.findFirst({ where: { status: "ACTIVE" } });
  if (existing) return;

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 30 * 86_400_000);
  await prisma.season.create({ data: { name: "Season 1: Genesis Brains", startsAt, endsAt, status: "ACTIVE" } });
}

async function seedDemoUsers() {
  const demoUsernames = ["figabrain_admin", "demo_farmer", "demo_sprout"];

  for (const username of demoUsernames) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) continue;

    const wallet = generateWallet();
    await prisma.user.create({
      data: {
        telegramId: `seed_${username}`,
        username,
        displayName: username,
        isAdmin: username === "figabrain_admin",
        brainPoints: username === "demo_farmer" ? 450 : 5,
        xp: username === "demo_farmer" ? 220 : 0,
        rank: username === "demo_farmer" ? "SIGMA" : "NPC",
        wallet: {
          create: {
            address: wallet.address,
            publicKey: wallet.publicKey,
            encryptedPrivateKey: wallet.encrypted.ciphertext,
            encryptionIv: wallet.encrypted.iv,
            encryptionAuthTag: wallet.encrypted.authTag,
          },
        },
      },
    });
  }
}

async function main() {
  await seedRewardConfig();
  await seedStakingPools();
  await seedMissions();
  await seedAchievements();
  await seedBoosters();
  await seedLootBoxes();
  await seedSeason();
  await seedDemoUsers();
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
