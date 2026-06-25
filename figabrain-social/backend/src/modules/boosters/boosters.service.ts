import type { BoosterSource, BoosterType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

/** Highest active multiplier of `type` for `userId`, or 1 (no-op) if none active. */
export async function getActiveMultiplier(userId: string, type: BoosterType): Promise<number> {
  const active = await prisma.userBooster.findFirst({
    where: { userId, type, expiresAt: { gt: new Date() } },
    orderBy: { multiplier: "desc" },
  });
  return active ? Number(active.multiplier) : 1;
}

export async function listActiveBoosters(userId: string) {
  const boosters = await prisma.userBooster.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    include: { booster: { select: { key: true, name: true, rarity: true } } },
    orderBy: { expiresAt: "asc" },
  });
  return boosters.map((b) => ({
    type: b.type,
    multiplier: Number(b.multiplier),
    source: b.source,
    expiresAt: b.expiresAt,
    booster: b.booster,
  }));
}

export async function grantBooster(userId: string, boosterKey: string, source: BoosterSource) {
  const booster = await prisma.booster.findUnique({ where: { key: boosterKey } });
  if (!booster) throw new HttpError(404, "Booster not found", "BOOSTER_NOT_FOUND");

  const userBooster = await prisma.userBooster.create({
    data: {
      userId,
      boosterId: booster.id,
      type: booster.type,
      multiplier: booster.multiplier,
      source,
      expiresAt: new Date(Date.now() + booster.durationSeconds * 1000),
    },
  });

  await prisma.economyLog.create({
    data: { userId, type: "BOOSTER_ACTIVATED", metadata: { boosterKey, source } },
  });

  return userBooster;
}
