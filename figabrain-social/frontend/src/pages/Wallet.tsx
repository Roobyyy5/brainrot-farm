import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { WalletInfo } from "../api/types";

export function Wallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);

  useEffect(() => {
    api.get<{ data: WalletInfo }>("/wallet/me").then((res) => setWallet(res.data));
  }, []);

  if (!wallet) return <p className="text-white/40 text-sm">Loading wallet...</p>;

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-1">Your FIGABRAIN Wallet</h2>
        <p className="text-xs text-white/40 mb-4">
          Internal {wallet.chain} wallet. Private key is encrypted at rest and never leaves the server.
        </p>
        <div className="bg-black/30 rounded-xl p-3 font-mono text-xs break-all mb-4">{wallet.address}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brain-point/10 border border-brain-point/30 rounded-xl p-4">
            <div className="text-xs text-white/50">Brain Points</div>
            <div className="text-2xl font-bold text-brain-point">{wallet.brainPoints.toFixed(2)}</div>
          </div>
          <div className="bg-brain-accent2/10 border border-brain-accent2/30 rounded-xl p-4">
            <div className="text-xs text-white/50">Token Balance (future)</div>
            <div className="text-2xl font-bold text-brain-accent2">{wallet.tokenBalance.toFixed(4)}</div>
          </div>
        </div>
      </div>
      <p className="text-xs text-white/30 text-center">
        Real on-chain transfers are not yet enabled. TON / Solana integration is staged behind the ChainProvider interface.
      </p>
    </div>
  );
}
