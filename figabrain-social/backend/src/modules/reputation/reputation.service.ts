import { prisma } from "../../lib/prisma.js";

const MIN_REPUTATION = -1000;
const MAX_REPUTATION = 1_000_000;

/** Reputation never goes through brainPoints/xp — it is a trust signal, adjusted directly by social proof or moderation events. */
export async function adjustReputation(userId: string, delta: number, reason: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { reputation: true } });
  const next = Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, user.reputation + delta));

  await prisma.user.update({ where: { id: userId }, data: { reputation: next } });
  await prisma.reputationLog.create({ data: { userId, delta: next - user.reputation, reason } });
}

export async function getReputationHistory(userId: string, take = 50) {
  return prisma.reputationLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}
