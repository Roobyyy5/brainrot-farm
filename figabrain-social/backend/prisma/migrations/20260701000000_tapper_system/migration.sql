-- AlterEnum: add TAP to MissionAction
ALTER TYPE "MissionAction" ADD VALUE 'TAP';

-- CreateTable TapperProfile
CREATE TABLE "TapperProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "energy" INTEGER NOT NULL DEFAULT 1000,
    "lastEnergyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tapPowerLevel" INTEGER NOT NULL DEFAULT 0,
    "energyMaxLevel" INTEGER NOT NULL DEFAULT 0,
    "regenRateLevel" INTEGER NOT NULL DEFAULT 0,
    "multiTapLevel" INTEGER NOT NULL DEFAULT 0,
    "autoBrainLevel" INTEGER NOT NULL DEFAULT 0,
    "totalTaps" INTEGER NOT NULL DEFAULT 0,
    "totalBpEarned" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "prestige" INTEGER NOT NULL DEFAULT 0,
    "skin" TEXT NOT NULL DEFAULT 'brain',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TapperProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable TapBatch
CREATE TABLE "TapBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tapperProfileId" TEXT NOT NULL,
    "tapCount" INTEGER NOT NULL,
    "bpEarned" DECIMAL(20,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable BossFight
CREATE TABLE "BossFight" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "reward" DECIMAL(20,4) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BossFight_pkey" PRIMARY KEY ("id")
);

-- CreateTable BossParticipant
CREATE TABLE "BossParticipant" (
    "id" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BossParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TapperProfile_userId_key" ON "TapperProfile"("userId");
CREATE INDEX "TapBatch_userId_createdAt_idx" ON "TapBatch"("userId", "createdAt");
CREATE INDEX "BossFight_startsAt_endsAt_idx" ON "BossFight"("startsAt", "endsAt");
CREATE UNIQUE INDEX "BossParticipant_bossId_userId_key" ON "BossParticipant"("bossId", "userId");
CREATE INDEX "BossParticipant_bossId_damage_idx" ON "BossParticipant"("bossId", "damage");

-- AddForeignKey
ALTER TABLE "TapperProfile" ADD CONSTRAINT "TapperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TapBatch" ADD CONSTRAINT "TapBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TapBatch" ADD CONSTRAINT "TapBatch_tapperProfileId_fkey" FOREIGN KEY ("tapperProfileId") REFERENCES "TapperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BossFight" ADD CONSTRAINT no_fk_needed CHECK (true);
ALTER TABLE "BossParticipant" ADD CONSTRAINT "BossParticipant_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "BossFight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BossParticipant" ADD CONSTRAINT "BossParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
