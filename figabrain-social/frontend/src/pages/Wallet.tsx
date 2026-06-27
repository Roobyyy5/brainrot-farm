import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { WalletInfo } from "../api/types";

interface ReferralInfo { referralLink: string; referralCount: number }

export function Wallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    api.get<{ data: WalletInfo }>("/wallet/me").then((res) => setWallet(res.data));
    api.get<{ data: ReferralInfo }>("/users/me/referral").then((res) => setReferral(res.data)).catch(() => {});
  }, []);

  function copyAddress() {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyReferral() {
    if (!referral) return;
    navigator.clipboard.writeText(referral.referralLink).then(() => {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    });
  }

  if (!wallet) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="glass-panel rounded-2xl p-6 h-56" />
        <div className="h-4 bg-white/5 rounded w-64 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-1">Your FIGABRAIN Wallet</h2>
        <p className="text-xs text-white/40 mb-4">
          Internal {wallet.chain} wallet · private key encrypted at rest
        </p>

        {/* Address with copy */}
        <div
          onClick={copyAddress}
          className="bg-black/30 hover:bg-black/50 rounded-xl p-3 font-mono text-xs break-all mb-4 cursor-pointer flex items-center gap-2 group transition-colors"
        >
          <span className="flex-1">{wallet.address}</span>
          <span className="text-white/30 group-hover:text-white/60 shrink-0 text-base">
            {copied ? "✓" : "⎘"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brain-point/10 border border-brain-point/30 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">Brain Points</div>
            <div className="text-2xl font-bold text-brain-point">{wallet.brainPoints.toFixed(2)}</div>
          </div>
          <div className="bg-brain-accent2/10 border border-brain-accent2/30 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">FGB Token</div>
            <div className="text-2xl font-bold text-brain-accent2">{wallet.tokenBalance.toFixed(4)}</div>
            <div className="text-xs text-white/30 mt-1">Token launches soon</div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 border border-brain-accent/20">
        <h3 className="text-sm font-semibold mb-2">🚀 Token Launch</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          FGB token will be deployed on {wallet.chain}. Your Brain Points will convert to FGB at launch.
          Keep earning BP now to secure your allocation.
        </p>
      </div>

      {/* Referral */}
      {referral && (
        <div className="glass-panel rounded-2xl p-4 border border-brain-accent2/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">👥 Referral Program</h3>
            <span className="text-xs text-white/40">{referral.referralCount} invited</span>
          </div>
          <p className="text-xs text-white/40 mb-3 leading-relaxed">
            Earn <span className="text-brain-point font-semibold">+50 BP</span> for each friend who joins via your link.
          </p>
          <div
            onClick={copyReferral}
            className="bg-black/30 hover:bg-black/50 rounded-xl p-3 text-xs font-mono break-all cursor-pointer flex items-center gap-2 group transition-colors"
          >
            <span className="flex-1 text-white/60">{referral.referralLink}</span>
            <span className="text-white/30 group-hover:text-white/60 shrink-0 text-base">{copiedRef ? "✓" : "⎘"}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-white/20 text-center">
        On-chain transfers not yet enabled. TON / Solana integration is staged.
      </p>
    </div>
  );
}
