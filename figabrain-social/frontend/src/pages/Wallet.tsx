import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { WalletInfo } from "../api/types";
import { useAuth } from "../context/AuthContext";

interface ReferralInfo { referralLink: string; referralCount: number }
interface ConversionHistory { id: string; brainPointsSpent: number; fgbTokenAmount: number; rate: number; createdAt: string }
interface ConversionInfo { rate: number; minPoints: number; history: ConversionHistory[] }

const MIN_POINTS = 100;

export function Wallet() {
  const { refreshUser } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [conversion, setConversion] = useState<ConversionInfo | null>(null);
  const [convertAmount, setConvertAmount] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<{ bp: number; fgb: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  function loadAll() {
    api.get<{ data: WalletInfo }>("/wallet/me").then((res) => setWallet(res.data));
    api.get<{ data: ReferralInfo }>("/users/me/referral").then((res) => setReferral(res.data)).catch(() => {});
    api.get<{ data: ConversionInfo }>("/web3/convert").then((res) => setConversion(res.data)).catch(() => {});
  }

  useEffect(() => { loadAll(); }, []);

  function copyAddress() {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function copyReferral() {
    if (!referral) return;
    navigator.clipboard.writeText(referral.referralLink).then(() => { setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); });
  }

  async function handleConvert() {
    const amount = Number(convertAmount);
    if (!amount || amount < MIN_POINTS) { setConvertError(`Minimum ${MIN_POINTS} BP`); return; }
    if (wallet && amount > wallet.brainPoints) { setConvertError("Insufficient Brain Points"); return; }
    setIsConverting(true);
    setConvertError(null);
    setConvertSuccess(null);
    try {
      const res = await api.post<{ data: { brainPointsSpent: number; fgbTokenAmount: number } }>("/web3/convert/convert", { brainPointsAmount: amount });
      setConvertSuccess({ bp: res.data.brainPointsSpent, fgb: res.data.fgbTokenAmount });
      setConvertAmount("");
      await refreshUser();
      loadAll();
    } catch (e) {
      setConvertError(e instanceof ApiError ? e.message : "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  }

  if (!wallet) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="glass-panel rounded-2xl p-6 h-56" />
        <div className="glass-panel rounded-2xl p-6 h-40" />
        <div className="h-4 bg-white/5 rounded w-64 mx-auto" />
      </div>
    );
  }

  const preview = conversion && convertAmount ? Number(convertAmount) * conversion.rate : null;

  return (
    <div className="space-y-4 max-w-md">
      {/* Balances */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-1">Your FIGABRAIN Wallet</h2>
        <p className="text-xs text-white/40 mb-4">Internal {wallet.chain} wallet · private key encrypted at rest</p>

        <div
          onClick={copyAddress}
          className="bg-black/30 hover:bg-black/50 rounded-xl p-3 font-mono text-xs break-all mb-4 cursor-pointer flex items-center gap-2 group transition-colors"
        >
          <span className="flex-1">{wallet.address}</span>
          <span className="text-white/30 group-hover:text-white/60 shrink-0 text-base">{copied ? "✓" : "⎘"}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brain-point/10 border border-brain-point/30 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">Brain Points</div>
            <div className="text-2xl font-bold text-brain-point">{wallet.brainPoints.toFixed(2)}</div>
          </div>
          <div className="bg-brain-accent2/10 border border-brain-accent2/30 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">FGB Token</div>
            <div className="text-2xl font-bold text-brain-accent2">{wallet.tokenBalance.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* BP → FGB Conversion */}
      {conversion && (
        <div className="glass-panel rounded-2xl p-5 border border-brain-accent/20">
          <h3 className="text-sm font-bold mb-1">🔄 Convert BP → FGB</h3>
          <p className="text-xs text-white/40 mb-3">
            Rate: <span className="text-white/60">{conversion.rate} FGB per BP</span> · Min: <span className="text-white/60">{conversion.minPoints} BP</span>
          </p>
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <input
                type="number"
                value={convertAmount}
                onChange={(e) => { setConvertAmount(e.target.value); setConvertError(null); setConvertSuccess(null); }}
                placeholder={`Min ${MIN_POINTS} BP`}
                min={MIN_POINTS}
                max={wallet.brainPoints}
                className="w-full bg-black/30 rounded-xl px-3 py-2.5 text-sm outline-none pr-10"
              />
              <button
                onClick={() => setConvertAmount(Math.floor(wallet.brainPoints).toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white"
              >
                MAX
              </button>
            </div>
            <button
              onClick={handleConvert}
              disabled={isConverting || !convertAmount}
              className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 rounded-xl disabled:opacity-40 shrink-0"
            >
              {isConverting ? "..." : "Convert"}
            </button>
          </div>
          {preview !== null && !convertError && !convertSuccess && (
            <p className="text-xs text-white/40">≈ <span className="text-brain-accent2 font-semibold">{preview.toFixed(4)} FGB</span></p>
          )}
          {convertError && <p className="text-xs text-red-400">{convertError}</p>}
          {convertSuccess && (
            <p className="text-xs text-green-400">✓ Converted {convertSuccess.bp} BP → {convertSuccess.fgb.toFixed(4)} FGB</p>
          )}

          {/* Conversion history */}
          {conversion.history.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-xs text-white/30 mb-2">Recent conversions</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {conversion.history.slice(0, 5).map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/40">{new Date(h.createdAt).toLocaleDateString()}</span>
                    <span className="text-brain-point">−{h.brainPointsSpent} BP</span>
                    <span className="text-brain-accent2">+{h.fgbTokenAmount.toFixed(4)} FGB</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Token launch info */}
      <div className="glass-panel rounded-2xl p-4 border border-white/5">
        <h3 className="text-sm font-semibold mb-2">🚀 Token Launch</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          FGB token will be deployed on {wallet.chain}. Converted FGB is credited to your off-chain balance now and will be settled on-chain at launch.
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

      <p className="text-xs text-white/20 text-center">On-chain transfers not yet enabled.</p>
    </div>
  );
}
