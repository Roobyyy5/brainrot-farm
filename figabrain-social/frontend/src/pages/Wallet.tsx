import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { WalletInfo } from "../api/types";
import { useAuth } from "../context/AuthContext";

interface ReferralInfo { referralLink: string; referralCount: number }
interface ConversionHistory { id: string; brainPointsSpent: number; fgbTokenAmount: number; rate: number; createdAt: string }
interface ConversionInfo { rate: number; minPoints: number; history: ConversionHistory[] }
interface StakingPool { id: string; name: string; apr: number; lockDays: number; minAmount: number; platformFeePercent: number }
interface StakingPosition { id: string; poolId: string; amount: number; unlocksAt: string; status: string; startedAt: string; pool: StakingPool }
interface AirdropClaim { id: string; amount: number; status: string; campaignId: string; campaign: { name: string; endsAt: string } }
interface NftItem { id: string; name: string; tokenUri: string; collection: { name: string } }
interface BpPackage { bpAmount: number; usdAmount: number }
interface BpPurchase { id: string; bpAmount: number; usdAmount: number; cryptoCurrency: string; status: string; txHash: string | null; createdAt: string }
interface LootBoxShopItem { id: string; key: string; name: string; rarity: string; price: number }

const MIN_POINTS = 100;

export function Wallet() {
  const { t } = useTranslation();
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

  // Staking
  const [stakingPools, setStakingPools] = useState<StakingPool[]>([]);
  const [myPositions, setMyPositions] = useState<StakingPosition[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);

  // Airdrops
  const [airdropClaims, setAirdropClaims] = useState<AirdropClaim[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // NFTs
  const [nfts, setNfts] = useState<NftItem[]>([]);

  // Buy BP
  const [bpPackages, setBpPackages] = useState<BpPackage[]>([]);
  const [payAddresses, setPayAddresses] = useState<Record<string, string>>({});
  const [buyStep, setBuyStep] = useState<"idle" | "select" | "paying" | "submitted">("idle");
  const [selectedPkg, setSelectedPkg] = useState<BpPackage | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [buyPurchaseId, setBuyPurchaseId] = useState<string | null>(null);
  const [txHashInput, setTxHashInput] = useState("");
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [copiedPayAddr, setCopiedPayAddr] = useState(false);
  const [myPurchases, setMyPurchases] = useState<BpPurchase[]>([]);

  // Loot Box Shop
  const [lootboxShop, setLootboxShop] = useState<LootBoxShopItem[]>([]);
  const [buyingLootbox, setBuyingLootbox] = useState<string | null>(null);

  // TGE Waitlist
  const [onTgeWaitlist, setOnTgeWaitlist] = useState(false);
  const [joiningTge, setJoiningTge] = useState(false);

  function loadAll() {
    api.get<{ data: WalletInfo }>("/wallet/me").then((res) => setWallet(res.data));
    api.get<{ data: ReferralInfo }>("/users/me/referral").then((res) => setReferral(res.data)).catch(() => {});
    api.get<{ data: ConversionInfo }>("/token-conversion").then((res) => setConversion(res.data)).catch(() => {});
    api.get<{ data: StakingPool[] }>("/web3/staking/pools").then((res) => setStakingPools(res.data)).catch(() => {});
    api.get<{ data: StakingPosition[] }>("/web3/staking/me").then((res) => setMyPositions(res.data)).catch(() => {});
    api.get<{ data: AirdropClaim[] }>("/web3/airdrops/me").then((res) => setAirdropClaims(res.data)).catch(() => {});
    api.get<{ data: NftItem[] }>("/web3/nfts/me").then((res) => setNfts(res.data)).catch(() => {});
    api.get<{ data: { packages: BpPackage[]; addresses: Record<string, string> } }>("/bp-purchase/packages")
      .then((res) => { setBpPackages(res.data.packages); setPayAddresses(res.data.addresses); }).catch(() => {});
    api.get<{ data: BpPurchase[] }>("/bp-purchase/me").then((res) => setMyPurchases(res.data)).catch(() => {});
    api.get<{ data: LootBoxShopItem[] }>("/lootboxes/shop").then((res) => setLootboxShop(res.data)).catch(() => {});
    api.get<{ data: { onWaitlist: boolean } }>("/web3/tge/waitlist/status").then((res) => setOnTgeWaitlist(res.data.onWaitlist)).catch(() => {});
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
      const res = await api.post<{ data: { brainPointsSpent: number; fgbTokenAmount: number } }>("/token-conversion/convert", { brainPointsAmount: amount });
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

  async function openStake() {
    if (!selectedPool || !stakeAmount) return;
    const amount = Number(stakeAmount);
    const pool = stakingPools.find((p) => p.id === selectedPool);
    if (!pool) return;
    if (amount < pool.minAmount) { setStakeError(`Minimum ${pool.minAmount} FGB`); return; }
    if (wallet && amount > wallet.tokenBalance) { setStakeError("Insufficient FGB balance"); return; }
    setIsStaking(true);
    setStakeError(null);
    try {
      await api.post("/web3/staking/open", { poolId: selectedPool, amount });
      setStakeAmount("");
      loadAll();
    } catch (e) {
      setStakeError(e instanceof ApiError ? e.message : "Staking failed");
    } finally {
      setIsStaking(false);
    }
  }

  async function closePosition(positionId: string) {
    try {
      await api.post(`/web3/staking/${positionId}/close`, {});
      loadAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Cannot close position yet");
    }
  }

  async function claimAirdrop(campaignId: string) {
    setClaimingId(campaignId);
    try {
      await api.post(`/web3/airdrops/${campaignId}/claim`, {});
      loadAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Claim failed");
    } finally {
      setClaimingId(null);
    }
  }

  async function initBuyBp() {
    if (!selectedPkg || !selectedCrypto) { setBuyError("Select a package and crypto"); return; }
    setBuyLoading(true); setBuyError(null);
    try {
      const res = await api.post<{ data: { id: string; cryptoAddress: string } }>("/bp-purchase/init", {
        bpAmount: selectedPkg.bpAmount,
        usdAmount: selectedPkg.usdAmount,
        cryptoCurrency: selectedCrypto,
      });
      setBuyPurchaseId(res.data.id);
      setBuyStep("paying");
    } catch (e) {
      setBuyError(e instanceof ApiError ? e.message : "Failed to create purchase");
    } finally {
      setBuyLoading(false);
    }
  }

  async function submitTxHash() {
    if (!buyPurchaseId || !txHashInput.trim()) { setBuyError("Enter TX hash"); return; }
    setBuyLoading(true); setBuyError(null);
    try {
      await api.post(`/bp-purchase/${buyPurchaseId}/submit-tx`, { txHash: txHashInput.trim() });
      setBuyStep("submitted");
      loadAll();
    } catch (e) {
      setBuyError(e instanceof ApiError ? e.message : "Failed to submit");
    } finally {
      setBuyLoading(false);
    }
  }

  function copyPayAddress() {
    const addr = selectedCrypto ? payAddresses[selectedCrypto] : null;
    if (!addr) return;
    navigator.clipboard.writeText(addr).then(() => { setCopiedPayAddr(true); setTimeout(() => setCopiedPayAddr(false), 2000); });
  }

  async function buyLootBox(lootBoxKey: string) {
    setBuyingLootbox(lootBoxKey);
    try {
      await api.post("/lootboxes/buy", { lootBoxKey });
      await refreshUser();
      loadAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Purchase failed");
    } finally {
      setBuyingLootbox(null);
    }
  }

  async function joinTgeWaitlist() {
    setJoiningTge(true);
    try {
      await api.post("/web3/tge/waitlist", {});
      setOnTgeWaitlist(true);
    } catch { } finally {
      setJoiningTge(false);
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
  const activePositions = myPositions.filter((p) => p.status === "ACTIVE");
  const claimableAirdrops = airdropClaims.filter((c) => c.status === "CLAIMABLE");

  return (
    <div className="space-y-4 max-w-md">
      {/* Balances */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-1">{t("wallet.title")}</h2>
        <p className="text-xs text-white/40 mb-4">{t("wallet.chain", { chain: wallet.chain })}</p>

        <div
          onClick={copyAddress}
          className="bg-black/30 hover:bg-black/50 rounded-xl p-3 font-mono text-xs break-all mb-4 cursor-pointer flex items-center gap-2 group transition-colors"
        >
          <span className="flex-1">{wallet.address}</span>
          <span className="text-white/30 group-hover:text-white/60 shrink-0 text-base">{copied ? "✓" : "⎘"}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brain-point/10 border border-brain-point/30 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">{t("profile.brainPoints")}</div>
            <div className="text-2xl font-bold text-brain-point">{wallet.brainPoints.toFixed(2)}</div>
          </div>
          <div className="bg-brain-accent2/10 border border-brain-accent2/30 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">FGB Token</div>
            <div className="text-2xl font-bold text-brain-accent2">{wallet.tokenBalance.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* Airdrop claims */}
      {claimableAirdrops.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-yellow-500/30 bg-yellow-500/5">
          <h3 className="text-sm font-bold mb-3">🎁 {t("wallet.airdrops")}</h3>
          <div className="space-y-2">
            {claimableAirdrops.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-black/20 rounded-xl p-3">
                <div>
                  <div className="text-sm font-semibold">{c.campaign.name}</div>
                  <div className="text-xs text-white/40">{c.amount} FGB · ends {new Date(c.campaign.endsAt).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => claimAirdrop(c.campaignId)}
                  disabled={claimingId === c.campaignId}
                  className="bg-yellow-500/80 hover:bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-full disabled:opacity-50"
                >
                  {claimingId === c.campaignId ? t("wallet.claiming") : t("wallet.claim")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BP → FGB Conversion */}
      {conversion && (
        <div className="glass-panel rounded-2xl p-5 border border-brain-accent/20">
          <h3 className="text-sm font-bold mb-1">🔄 {t("wallet.convertTitle")}</h3>
          <p className="text-xs text-white/40 mb-3">
            {t("wallet.convertRate", { rate: conversion.rate, min: conversion.minPoints })}
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
                {t("wallet.maxBtn")}
              </button>
            </div>
            <button
              onClick={handleConvert}
              disabled={isConverting || !convertAmount}
              className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 rounded-xl disabled:opacity-40 shrink-0"
            >
              {isConverting ? t("wallet.converting") : t("wallet.convert")}
            </button>
          </div>
          {preview !== null && !convertError && !convertSuccess && (
            <p className="text-xs text-white/40">≈ <span className="text-brain-accent2 font-semibold">{preview.toFixed(4)} FGB</span></p>
          )}
          {convertError && <p className="text-xs text-red-400">{convertError}</p>}
          {convertSuccess && (
            <p className="text-xs text-green-400">✓ Converted {convertSuccess.bp} BP → {convertSuccess.fgb.toFixed(4)} FGB</p>
          )}

          {conversion.history.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-xs text-white/30 mb-2">{t("wallet.recentConversions")}</p>
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

      {/* Staking */}
      {stakingPools.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-brain-accent2/20">
          <h3 className="text-sm font-bold mb-3">🔒 {t("wallet.stakeTitle")}</h3>

          <div className="space-y-2 mb-4">
            <select
              value={selectedPool}
              onChange={(e) => setSelectedPool(e.target.value)}
              className="w-full bg-black/30 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none"
            >
              <option value="">{t("wallet.selectPool")}</option>
              {stakingPools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {Number(p.apr).toFixed(1)}% APR · {p.lockDays}d lock · min {Number(p.minAmount)} FGB · {Number(p.platformFeePercent).toFixed(0)}% fee
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => { setStakeAmount(e.target.value); setStakeError(null); }}
                  placeholder="Amount FGB"
                  className="w-full bg-black/30 rounded-xl px-3 py-2.5 text-sm outline-none pr-10"
                />
                <button
                  onClick={() => setStakeAmount(Math.floor(wallet.tokenBalance).toString())}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white"
                >
                  {t("wallet.maxBtn")}
                </button>
              </div>
              <button
                onClick={openStake}
                disabled={isStaking || !selectedPool || !stakeAmount}
                className="bg-brain-accent2/80 hover:bg-brain-accent2 text-sm font-semibold px-4 rounded-xl disabled:opacity-40 shrink-0"
              >
                {isStaking ? t("wallet.converting") : t("wallet.stakeBtn")}
              </button>
            </div>
            {stakeError && <p className="text-xs text-red-400">{stakeError}</p>}
          </div>

          {activePositions.length > 0 && (
            <div>
              <p className="text-xs text-white/30 mb-2">{t("wallet.yourPositions")}</p>
              <div className="space-y-2">
                {activePositions.map((pos) => {
                  const unlocked = new Date(pos.unlocksAt) <= new Date();
                  return (
                    <div key={pos.id} className="bg-black/20 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">{pos.pool.name}</div>
                        <div className="text-xs text-white/40">
                          {Number(pos.amount).toFixed(2)} FGB · unlocks {new Date(pos.unlocksAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => closePosition(pos.id)}
                        disabled={!unlocked}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                          unlocked
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-white/5 text-white/20 cursor-not-allowed"
                        }`}
                      >
                        {unlocked ? t("wallet.collect") : t("wallet.locked")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buy BP with Crypto */}
      {bpPackages.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-brain-point/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">💰 {t("wallet.buyBp", "Buy Brain Points")}</h3>
            {buyStep !== "idle" && (
              <button onClick={() => { setBuyStep("idle"); setBuyError(null); setTxHashInput(""); }} className="text-xs text-white/30 hover:text-white">✕</button>
            )}
          </div>

          {buyStep === "idle" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {bpPackages.map((pkg) => (
                  <button
                    key={pkg.bpAmount}
                    onClick={() => setSelectedPkg(pkg)}
                    className={`rounded-xl p-3 text-left border transition-colors ${selectedPkg?.bpAmount === pkg.bpAmount ? "border-brain-point bg-brain-point/10" : "border-white/10 bg-black/20 hover:border-brain-point/40"}`}
                  >
                    <div className="text-sm font-bold text-brain-point">{pkg.bpAmount.toLocaleString()} BP</div>
                    <div className="text-xs text-white/50">${pkg.usdAmount}</div>
                  </button>
                ))}
              </div>
              <select
                value={selectedCrypto}
                onChange={(e) => setSelectedCrypto(e.target.value)}
                className="w-full bg-black/30 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none"
              >
                <option value="">{t("wallet.selectCrypto", "Select crypto...")}</option>
                {Object.keys(payAddresses).map((c) => (
                  <option key={c} value={c}>{c.replace("_", " ")}</option>
                ))}
              </select>
              {buyError && <p className="text-xs text-red-400">{buyError}</p>}
              <button
                onClick={initBuyBp}
                disabled={buyLoading || !selectedPkg || !selectedCrypto}
                className="w-full bg-gradient-to-r from-brain-point/80 to-brain-accent text-sm font-bold py-2.5 rounded-xl disabled:opacity-40"
              >
                {buyLoading ? "..." : t("wallet.proceedToPay", "Proceed to Pay")}
              </button>
            </div>
          )}

          {buyStep === "paying" && selectedPkg && (
            <div className="space-y-3">
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-xs text-white/40 mb-1">{t("wallet.sendExactly", "Send exactly")}</div>
                <div className="text-xl font-bold text-brain-point">${selectedPkg.usdAmount}</div>
                <div className="text-xs text-white/40">{selectedCrypto.replace("_", " ")} to receive {selectedPkg.bpAmount.toLocaleString()} BP</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">{t("wallet.paymentAddress", "Payment address")}</div>
                <div
                  onClick={copyPayAddress}
                  className="bg-black/40 rounded-xl p-3 font-mono text-xs break-all cursor-pointer flex items-center gap-2 group hover:bg-black/60 transition-colors"
                >
                  <span className="flex-1 text-white/70">{payAddresses[selectedCrypto]}</span>
                  <span className="text-white/30 group-hover:text-white/60 shrink-0">{copiedPayAddr ? "✓" : "⎘"}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">{t("wallet.enterTxHash", "Enter TX hash after sending")}</div>
                <input
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-black/30 rounded-xl px-3 py-2.5 text-sm font-mono outline-none"
                />
              </div>
              {buyError && <p className="text-xs text-red-400">{buyError}</p>}
              <button
                onClick={submitTxHash}
                disabled={buyLoading || !txHashInput.trim()}
                className="w-full bg-gradient-to-r from-brain-point/80 to-brain-accent text-sm font-bold py-2.5 rounded-xl disabled:opacity-40"
              >
                {buyLoading ? "..." : t("wallet.confirmPayment", "Confirm Payment")}
              </button>
            </div>
          )}

          {buyStep === "submitted" && (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-semibold">{t("wallet.paymentReceived", "Payment submitted!")}</p>
              <p className="text-xs text-white/40 mt-1">{t("wallet.paymentPending", "We'll credit your BP after verifying the transaction. Usually within 1 hour.")}</p>
              <button onClick={() => setBuyStep("idle")} className="mt-3 text-xs text-brain-accent hover:text-white">
                {t("wallet.buyMore", "Buy more BP")}
              </button>
            </div>
          )}

          {/* Purchase history */}
          {myPurchases.length > 0 && buyStep === "idle" && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-white/30 mb-2">{t("wallet.recentPurchases", "Recent purchases")}</p>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {myPurchases.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/40">{new Date(p.createdAt).toLocaleDateString()}</span>
                    <span className="text-brain-point">+{p.bpAmount.toLocaleString()} BP</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.status === "APPROVED" ? "bg-green-500/20 text-green-400" :
                      p.status === "REJECTED" ? "bg-red-500/20 text-red-400" :
                      p.status === "SUBMITTED" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-white/10 text-white/40"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loot Box Shop */}
      {lootboxShop.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-purple-500/20">
          <h3 className="text-sm font-bold mb-1">🎲 {t("wallet.buyLootboxTitle")}</h3>
          <p className="text-xs text-white/40 mb-3">{t("wallet.buyLootboxDesc")}</p>
          <div className="grid grid-cols-2 gap-2">
            {lootboxShop.map((box) => (
              <div key={box.id} className="bg-black/20 rounded-xl p-3 flex flex-col gap-2">
                <div>
                  <div className="text-sm font-semibold">{box.name}</div>
                  <div className="text-xs text-white/40">{box.rarity}</div>
                  <div className="text-xs text-brain-point font-bold mt-1">{box.price} BP</div>
                </div>
                <button
                  onClick={() => buyLootBox(box.key)}
                  disabled={buyingLootbox === box.key || wallet.brainPoints < box.price}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                >
                  {buyingLootbox === box.key ? "..." : t("wallet.buy")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NFT Gallery */}
      {nfts.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-3">🖼 {t("wallet.nfts")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {nfts.map((nft) => (
              <a
                key={nft.id}
                href={nft.tokenUri}
                target="_blank"
                rel="noreferrer"
                className="bg-black/20 rounded-xl p-2 text-center hover:bg-white/5 transition-colors"
              >
                <div className="text-2xl mb-1">🎨</div>
                <div className="text-[10px] text-white/60 truncate">{nft.name}</div>
                <div className="text-[9px] text-white/30 truncate">{nft.collection.name}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Token launch info + TGE Waitlist */}
      <div className="glass-panel rounded-2xl p-4 border border-white/5">
        <h3 className="text-sm font-semibold mb-2">🚀 {t("wallet.tokenLaunch")}</h3>
        <p className="text-xs text-white/50 leading-relaxed mb-3">
          {t("wallet.tokenLaunchDesc", { chain: wallet.chain })}
        </p>
        <p className="text-xs text-white/40 mb-2">{t("wallet.tgeWaitlistDesc")}</p>
        <button
          onClick={joinTgeWaitlist}
          disabled={onTgeWaitlist || joiningTge}
          className={`w-full text-xs font-semibold py-2 rounded-xl transition-colors ${
            onTgeWaitlist
              ? "bg-green-500/15 text-green-400 cursor-default"
              : "bg-white/5 hover:bg-white/10 text-white/70 disabled:opacity-40"
          }`}
        >
          {joiningTge ? "..." : onTgeWaitlist ? t("wallet.tgeJoined") : t("wallet.tgeJoin")}
        </button>
      </div>

      {/* Referral */}
      {referral && (
        <div className="glass-panel rounded-2xl p-4 border border-brain-accent2/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">👥 {t("wallet.referralTitle")}</h3>
            <span className="text-xs text-white/40">{referral.referralCount} invited</span>
          </div>
          <p className="text-xs text-white/40 mb-3 leading-relaxed">
            {t("wallet.referralDesc")}
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

      <p className="text-xs text-white/20 text-center">{t("wallet.onChainDisabled")}</p>
    </div>
  );
}
