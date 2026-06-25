import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export async function grantLootBox(userId: string, lootBoxKey: string, source: string) {
  const lootBox = await prisma.lootBox.findUnique({ where: { key: lootBoxKey } });
  if (!lootBox) throw new HttpError(404, "Loot box not found", "LOOTBOX_NOT_FOUND");

  return prisma.userLootBox.create({ data: { userId, lootBoxId: lootBox.id, source } });
}

export interface LootBoxOpenResult {
  pointsAwarded: number;
  xpAwarded: number;
  boosterKey: string | null;
}

/** Opens a previously-granted, unopened loot box and applies its rolled reward to the user. */
export async function openLootBox(userId: string, userLootBoxId: string): Promise<LootBoxOpenResult> {
  const userLootBox = await prisma.userLootBox.findUnique({
    where: { id: userLootBoxId },
    include: { lootBox: true },
  });

  if (!userLootBox || userLootBox.userId !== userId) {
    throw new HttpError(404, "Loot box not found", "LOOTBOX_NOT_FOUND");
  }
  if (userLootBox.opened) {
    throw new HttpError(409, "Loot box already opened", "LOOTBOX_ALREADY_OPENED");
  }

  const box = userLootBox.lootBox;
  const pointsAwarded = Math.round(randomInRange(Number(box.pointsMin), Number(box.pointsMax)) * 100) / 100;
  const xpAwarded = Math.round(randomInRange(box.xpMin, box.xpMax));
  const wonBooster = Math.random() < Number(box.boosterChance);

  let boosterKey: string | null = null;
  if (wonBooster) {
    const candidates = await prisma.booster.findMany({ where: { rarity: box.rarity } });
    if (candidates.length > 0) {
      boosterKey = candidates[Math.floor(Math.random() * candidates.length)].key;
    }
  }

  // All writes — including booster grant — are in one transaction so a crash
  // between steps can never mark the box opened without crediting the reward,
  // or credit BP/XP without granting the booster.
  await prisma.$transaction(async (tx) => {
    await tx.userLootBox.update({
      where: { id: userLootBoxId },
      data: { opened: true, openedAt: new Date(), rewardJson: { pointsAwarded, xpAwarded, boosterKey } },
    });
    await tx.user.update({
      where: { id: userId },
      data: { brainPoints: { increment: pointsAwarded }, xp: { increment: xpAwarded } },
    });
    await tx.economyLog.create({
      data: { userId, type: "LOOTBOX_OPENED", amount: pointsAwarded, metadata: { lootBoxKey: box.key, xpAwarded, boosterKey } },
    });

    if (boosterKey) {
      const booster = await tx.booster.findUnique({ where: { key: boosterKey } });
      if (booster) {
        await tx.userBooster.create({
          data: {
            userId,
            boosterId: booster.id,
            type: booster.type,
            multiplier: booster.multiplier,
            source: "LOOTBOX",
            expiresAt: new Date(Date.now() + booster.durationSeconds * 1000),
          },
        });
        await tx.economyLog.create({
          data: { userId, type: "BOOSTER_ACTIVATED", metadata: { boosterKey, source: "LOOTBOX" } },
        });
      }
    }
  });

  return { pointsAwarded, xpAwarded, boosterKey };
}

export async function listUserLootBoxes(userId: string) {
  return prisma.userLootBox.findMany({
    where: { userId },
    include: { lootBox: { select: { key: true, name: true, rarity: true } } },
    orderBy: { createdAt: "desc" },
  });
}
