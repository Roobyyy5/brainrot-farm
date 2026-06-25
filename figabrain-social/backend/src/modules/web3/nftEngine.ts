import { prisma } from "../../lib/prisma.js";
import type { ChainProvider } from "./chainProvider.js";

/**
 * Off-chain NFT registry. `mint` records ownership in Postgres immediately
 * (e.g. for achievement badges); `mintOnChain` is the future path once a
 * ChainProvider can actually mint, keeping the same row shape either way.
 */
export class NftEngine {
  constructor(private readonly provider: ChainProvider) {}

  async mint(collectionId: string, ownerId: string, tokenId: string, metadataUri: string) {
    return prisma.nft.create({
      data: { collectionId, ownerId, tokenId, metadataUri },
    });
  }

  async mintOnChain(collectionId: string, ownerId: string, tokenId: string, metadataUri: string) {
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId }, include: { wallet: true } });
    if (!owner.wallet) throw new Error("Owner has no wallet");

    await this.provider.mintNft(owner.wallet.address, metadataUri);

    return prisma.nft.create({
      data: { collectionId, ownerId, tokenId, metadataUri },
    });
  }
}
