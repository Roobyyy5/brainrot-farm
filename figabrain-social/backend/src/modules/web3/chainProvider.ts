/**
 * Chain-agnostic boundary for future on-chain integration. Brain Points and
 * the engines below operate purely off-chain today; once a real token
 * launches, an implementation of this interface (TonChainProvider /
 * SolanaChainProvider) gets plugged into each engine's constructor and the
 * rest of the codebase does not change.
 */
export interface ChainProvider {
  readonly chain: "TON" | "SOLANA";
  getBalance(address: string): Promise<bigint>;
  transfer(fromAddress: string, toAddress: string, amount: bigint): Promise<string>;
  mintNft(ownerAddress: string, metadataUri: string): Promise<string>;
}

export class UnimplementedChainProvider implements ChainProvider {
  constructor(public readonly chain: "TON" | "SOLANA") {}

  async getBalance(): Promise<bigint> {
    throw new Error(`${this.chain} provider is not wired to a live network yet`);
  }

  async transfer(): Promise<string> {
    throw new Error(`${this.chain} provider is not wired to a live network yet`);
  }

  async mintNft(): Promise<string> {
    throw new Error(`${this.chain} provider is not wired to a live network yet`);
  }
}
