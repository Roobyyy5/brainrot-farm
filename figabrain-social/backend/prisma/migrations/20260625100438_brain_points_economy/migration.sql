-- CreateEnum
CREATE TYPE "MissionPeriod" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "MissionAction" AS ENUM ('LIKE', 'COMMENT', 'POST', 'FOLLOW', 'REFERRAL', 'REPOST', 'LOGIN');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('SOCIAL', 'CONTENT', 'COMMUNITY', 'REFERRAL', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "BoosterType" AS ENUM ('BRAIN_POINTS_MULTIPLIER', 'XP_MULTIPLIER', 'REFERRAL_BOOST');

-- CreateEnum
CREATE TYPE "BoosterSource" AS ENUM ('LOOTBOX', 'ACHIEVEMENT', 'SEASON_REWARD', 'STREAK_MILESTONE', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "TokenConversionStatus" AS ENUM ('SIMULATED');

-- AlterEnum
BEGIN;
CREATE TYPE "Rank_new" AS ENUM ('NPC', 'NORMIE', 'SIGMA', 'GIGACHAD', 'BRAIN_LORD', 'MEME_EMPEROR', 'GALAXY_BRAIN', 'NEURAL_GOD');
ALTER TABLE "User" ALTER COLUMN "rank" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "rank" TYPE "Rank_new" USING (
  CASE "rank"::text
    WHEN 'SEED' THEN 'NPC'
    WHEN 'SPROUT' THEN 'NORMIE'
    WHEN 'FARMER' THEN 'SIGMA'
    WHEN 'HARVESTER' THEN 'GIGACHAD'
    WHEN 'BRAINLORD' THEN 'BRAIN_LORD'
    ELSE 'NPC'
  END::"Rank_new"
);
ALTER TYPE "Rank" RENAME TO "Rank_old";
ALTER TYPE "Rank_new" RENAME TO "Rank";
DROP TYPE "Rank_old";
ALTER TABLE "User" ALTER COLUMN "rank" SET DEFAULT 'NPC';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reputation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streakCycle" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "rank" SET DEFAULT 'NPC';

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "period" "MissionPeriod" NOT NULL,
    "action" "MissionAction" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "pointsReward" DECIMAL(20,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "icon" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "pointsReward" DECIMAL(20,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakMilestoneClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestone" INTEGER NOT NULL,
    "streakCycle" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakMilestoneClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booster" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BoosterType" NOT NULL,
    "multiplier" DECIMAL(4,2) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBooster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "type" "BoosterType" NOT NULL,
    "multiplier" DECIMAL(4,2) NOT NULL,
    "source" "BoosterSource" NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBooster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootBox" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "pointsMin" DECIMAL(20,4) NOT NULL,
    "pointsMax" DECIMAL(20,4) NOT NULL,
    "xpMin" INTEGER NOT NULL,
    "xpMax" INTEGER NOT NULL,
    "boosterChance" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LootBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLootBox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lootBoxId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "rewardJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLootBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonParticipant" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonPoints" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "seasonXp" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SeasonParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(20,4),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenConversionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brainPointsSpent" DECIMAL(20,4) NOT NULL,
    "fgbTokenAmount" DECIMAL(36,18) NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "status" "TokenConversionStatus" NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenConversionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mission_key_key" ON "Mission"("key");

-- CreateIndex
CREATE INDEX "Mission_period_active_idx" ON "Mission"("period", "active");

-- CreateIndex
CREATE INDEX "UserMission_userId_periodKey_idx" ON "UserMission"("userId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserMission_userId_missionId_periodKey_key" ON "UserMission"("userId", "missionId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "StreakMilestoneClaim_userId_milestone_streakCycle_key" ON "StreakMilestoneClaim"("userId", "milestone", "streakCycle");

-- CreateIndex
CREATE UNIQUE INDEX "Booster_key_key" ON "Booster"("key");

-- CreateIndex
CREATE INDEX "UserBooster_userId_type_expiresAt_idx" ON "UserBooster"("userId", "type", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LootBox_key_key" ON "LootBox"("key");

-- CreateIndex
CREATE INDEX "UserLootBox_userId_opened_idx" ON "UserLootBox"("userId", "opened");

-- CreateIndex
CREATE INDEX "SeasonParticipant_seasonId_seasonPoints_idx" ON "SeasonParticipant"("seasonId", "seasonPoints");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonParticipant_seasonId_userId_key" ON "SeasonParticipant"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "ReputationLog_userId_createdAt_idx" ON "ReputationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EconomyLog_userId_type_createdAt_idx" ON "EconomyLog"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "EconomyLog_type_createdAt_idx" ON "EconomyLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "TokenConversionRequest_userId_createdAt_idx" ON "TokenConversionRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "User_xp_idx" ON "User"("xp");

-- CreateIndex
CREATE INDEX "User_reputation_idx" ON "User"("reputation");

-- AddForeignKey
ALTER TABLE "UserMission" ADD CONSTRAINT "UserMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMission" ADD CONSTRAINT "UserMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakMilestoneClaim" ADD CONSTRAINT "StreakMilestoneClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBooster" ADD CONSTRAINT "UserBooster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBooster" ADD CONSTRAINT "UserBooster_boosterId_fkey" FOREIGN KEY ("boosterId") REFERENCES "Booster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLootBox" ADD CONSTRAINT "UserLootBox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLootBox" ADD CONSTRAINT "UserLootBox_lootBoxId_fkey" FOREIGN KEY ("lootBoxId") REFERENCES "LootBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonParticipant" ADD CONSTRAINT "SeasonParticipant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonParticipant" ADD CONSTRAINT "SeasonParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationLog" ADD CONSTRAINT "ReputationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomyLog" ADD CONSTRAINT "EconomyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenConversionRequest" ADD CONSTRAINT "TokenConversionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

