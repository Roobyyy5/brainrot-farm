import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { status: "ACTIVE" }, orderBy: { startsAt: "desc" } });
}

/** Accrues season-scoped points/xp alongside the lifetime totals; no-op if no season is running. */
export async function recordSeasonProgress(userId: string, points: Prisma.Decimal | number, xp: number): Promise<void> {
  const season = await getActiveSeason();
  if (!season) return;

  await prisma.seasonParticipant.upsert({
    where: { seasonId_userId: { seasonId: season.id, userId } },
    create: { seasonId: season.id, userId, seasonPoints: points, seasonXp: xp },
    update: { seasonPoints: { increment: points }, seasonXp: { increment: xp } },
  });
}

export async function getSeasonLeaderboard(seasonId: string, take = 100) {
  const rows = await prisma.seasonParticipant.findMany({
    where: { seasonId },
    orderBy: { seasonPoints: "desc" },
    take,
    include: { user: { select: { username: true, displayName: true, avatarUrl: true, rank: true } } },
  });
  return rows.map((r, index) => ({
    position: index + 1,
    seasonPoints: Number(r.seasonPoints),
    seasonXp: r.seasonXp,
    finalRank: r.finalRank,
    user: r.user,
  }));
}

export async function startSeason(name: string, durationDays = 30) {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + durationDays * 86_400_000);
  return prisma.season.create({ data: { name, startsAt, endsAt, status: "ACTIVE" } });
}

/** Freezes final ranks for every participant and marks the season ENDED.
 *  Batches updates in chunks of 200 with a 120 s timeout so large seasons
 *  don't hit the default interactive-transaction timeout. */
export async function endSeason(seasonId: string): Promise<number> {
  const participants = await prisma.seasonParticipant.findMany({
    where: { seasonId },
    orderBy: { seasonPoints: "desc" },
    select: { id: true },
  });

  const CHUNK = 200;

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < participants.length; i += CHUNK) {
        await Promise.all(
          participants.slice(i, i + CHUNK).map((p, j) =>
            tx.seasonParticipant.update({ where: { id: p.id }, data: { finalRank: i + j + 1 } })
          )
        );
      }
      await tx.season.update({ where: { id: seasonId }, data: { status: "ENDED" } });
    },
    { timeout: 120_000 }
  );

  return participants.length;
}

/** Returns the BP reward for a given final rank. */
export function seasonRewardBP(rank: number): number {
  if (rank === 1) return 5_000;
  if (rank === 2) return 3_000;
  if (rank === 3) return 2_000;
  if (rank <= 10) return 1_000;
  if (rank <= 25) return 500;
  if (rank <= 50) return 200;
  if (rank <= 100) return 100;
  return 50;
}
