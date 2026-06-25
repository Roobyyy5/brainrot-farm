import { prisma } from "../../lib/prisma.js";

/**
 * Computes and books airdrop allocations off-chain. Claims sit in
 * AirdropClaim with status CLAIMABLE until a real token exists; the
 * `claim` step here only marks the ledger row CLAIMED — wiring it to an
 * actual transfer is the ChainProvider's job once a token is live.
 */
export class AirdropEngine {
  async createCampaign(input: {
    name: string;
    totalAmount: number;
    perUserAmount: number;
    startsAt: Date;
    endsAt: Date;
    eligibleUserIds: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const campaign = await tx.airdropCampaign.create({
        data: {
          name: input.name,
          totalAmount: input.totalAmount,
          perUserAmount: input.perUserAmount,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        },
      });

      await tx.airdropClaim.createMany({
        data: input.eligibleUserIds.map((userId) => ({
          campaignId: campaign.id,
          userId,
          amount: input.perUserAmount,
          status: "CLAIMABLE" as const,
        })),
      });

      return campaign;
    });
  }

  async claim(campaignId: string, userId: string) {
    const claim = await prisma.airdropClaim.findUniqueOrThrow({
      where: { campaignId_userId: { campaignId, userId } },
    });

    if (claim.status !== "CLAIMABLE") {
      throw new Error(`Airdrop claim is not claimable (status: ${claim.status})`);
    }

    return prisma.airdropClaim.update({
      where: { id: claim.id },
      data: { status: "CLAIMED", claimedAt: new Date() },
    });
  }
}
