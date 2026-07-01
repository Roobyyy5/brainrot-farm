import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { BrainCoin } from "../components/tapper/BrainCoin";
import { EnergyBar } from "../components/tapper/EnergyBar";
import { ComboMeter } from "../components/tapper/ComboMeter";
import { TapUpgradeShop } from "../components/tapper/TapUpgradeShop";
import { OfflineModal } from "../components/tapper/OfflineModal";
import { BossCard } from "../components/tapper/BossCard";
import { TapLeaderboard } from "../components/tapper/TapLeaderboard";

interface TapperState {
  energy: number;
  energyMax: number;
  regenRate: number;
  tapPower: number;
  multiTap: number;
  autoBrainBpPerMin: number;
  levels: {
    tapPower: number;
    energyMax: number;
    regenRate: number;
    multiTap: number;
    autoBrain: number;
  };
  totalTaps: number;
  totalBpEarned: number;
  prestige: number;
  skin: string;
  offlineBP: number;
  boss: {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    reward: number;
    endsAt: string;
    myDamage: number;
  } | null;
}

const SKIN_ICONS: Record<string, string> = {
  brain: "🧠",
  robot: "🤖",
  diamond: "💎",
  crown: "👑",
};

export function Tap() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();

  const [state, setState] = useState<TapperState | null>(null);
  const [energy, setEnergy] = useState(0);
  const [pendingTaps, setPendingTaps] = useState(0);
  const [totalBpFloat, setTotalBpFloat] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboMul, setComboMul] = useState(1);
  const [showOffline, setShowOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<"tap" | "upgrades" | "boss" | "leaderboard">("tap");
  const [isLoading, setIsLoading] = useState(true);
  const [lastCrit, setLastCrit] = useState(false);

  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const energyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef(0);
  const stateRef = useRef<TapperState | null>(null);
  const lastBatchAt = useRef(Date.now());

  // Load initial state
  useEffect(() => {
    api.get<{ data: TapperState }>("/tapper/me").then((res) => {
      setState(res.data);
      stateRef.current = res.data;
      setEnergy(res.data.energy);
      setTotalBpFloat(res.data.totalBpEarned);
      setIsLoading(false);
      if (res.data.offlineBP > 0.1) setShowOffline(true);
    });
  }, []);

  // Real-time energy regen
  useEffect(() => {
    if (!state) return;
    energyTimerRef.current = setInterval(() => {
      setEnergy((prev) => {
        const max = stateRef.current?.energyMax ?? 1000;
        const rate = stateRef.current?.regenRate ?? 2;
        return Math.min(max, prev + rate);
      });
    }, 1000);
    return () => { if (energyTimerRef.current) clearInterval(energyTimerRef.current); };
  }, [state?.energyMax, state?.regenRate]);

  // Batch submit every 3 seconds
  useEffect(() => {
    batchTimerRef.current = setInterval(async () => {
      const pending = pendingRef.current;
      if (pending === 0) return;
      pendingRef.current = 0;
      setPendingTaps(0);
      lastBatchAt.current = Date.now();

      try {
        const res = await api.post<{ data: { bpEarned: number; offlineBP: number; energy: number; energyMax: number; isCrit: boolean } }>(
          "/tapper/tap",
          { count: pending }
        );
        setEnergy(res.data.energy);
        setLastCrit(res.data.isCrit);
        setTotalBpFloat((prev) => prev + res.data.bpEarned);
        if (res.data.isCrit) {
          setTimeout(() => setLastCrit(false), 1500);
        }
        refreshUser();
      } catch {
        // non-critical: energy already updated optimistically
      }
    }, 3000);

    return () => { if (batchTimerRef.current) clearInterval(batchTimerRef.current); };
  }, [refreshUser]);

  const handleTap = useCallback(() => {
    if (!stateRef.current) return;
    const multiTap = stateRef.current.multiTap;

    setEnergy((prev) => {
      if (prev < multiTap) return prev;
      return prev - multiTap;
    });

    if (energy < (stateRef.current?.multiTap ?? 1)) return;

    pendingRef.current += 1;
    setPendingTaps((p) => p + 1);

    // Combo system
    setCombo((prev) => {
      const next = prev + 1;
      let mul = 1;
      if (next >= 100) mul = 5;
      else if (next >= 50) mul = 3;
      else if (next >= 20) mul = 2;
      else if (next >= 10) mul = 1.5;
      setComboMul(mul);
      return next;
    });

    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      setCombo(0);
      setComboMul(1);
    }, 1500);
  }, [energy]);

  const handleUpgradeBought = useCallback(() => {
    api.get<{ data: TapperState }>("/tapper/me").then((res) => {
      setState(res.data);
      stateRef.current = res.data;
      setEnergy(res.data.energy);
      refreshUser();
    });
  }, [refreshUser]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl animate-bounce">🧠</div>
        <div className="text-white/40 text-sm">{t("tap.loading", "Loading Tapper...")}</div>
      </div>
    );
  }

  if (!state) return null;

  const skinIcon = SKIN_ICONS[state.skin] ?? "🧠";
  const prestigeBonus = state.prestige * 10;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Offline earnings modal */}
      {showOffline && state.offlineBP > 0 && (
        <OfflineModal bp={state.offlineBP} onClose={() => setShowOffline(false)} />
      )}

      {/* Stats header */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-xs text-white/40">{t("tap.totalTaps", "Total Taps")}</span>
            <div className="text-lg font-bold text-brain-accent">
              {state.totalTaps.toLocaleString()}
              {state.prestige > 0 && (
                <span className="ml-2 text-xs text-yellow-400 font-normal">✨ Prestige {state.prestige} (+{prestigeBonus}%)</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-white/40">{t("tap.totalEarned", "Total Earned")}</span>
            <div className="text-lg font-bold text-brain-point">{totalBpFloat.toFixed(1)} BP</div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/40 mt-2">
          <span>⚡ {state.tapPower} BP/tap</span>
          <span>×{state.multiTap} multi</span>
          {state.autoBrainBpPerMin > 0 && <span>🤖 {state.autoBrainBpPerMin} BP/min</span>}
          {combo > 0 && <span className="text-brain-accent font-bold">🔥 x{comboMul} combo!</span>}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 glass-panel rounded-xl p-1">
        {(["tap", "upgrades", "boss", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab ? "bg-brain-accent text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {tab === "tap" && "🧠 Tap"}
            {tab === "upgrades" && "⬆️ Upgrades"}
            {tab === "boss" && "💀 Boss"}
            {tab === "leaderboard" && "🏆 Top"}
          </button>
        ))}
      </div>

      {/* TAP TAB */}
      {activeTab === "tap" && (
        <div className="flex flex-col items-center gap-4">
          <ComboMeter combo={combo} multiplier={comboMul} />

          <EnergyBar current={energy} max={state.energyMax} regenRate={state.regenRate} />

          {lastCrit && (
            <div className="text-yellow-400 font-black text-2xl animate-ping absolute pointer-events-none">
              CRIT ×10!
            </div>
          )}

          <BrainCoin
            icon={skinIcon}
            tapPower={state.tapPower}
            multiTap={state.multiTap}
            comboMul={comboMul}
            energy={energy}
            onTap={handleTap}
          />

          <div className="text-xs text-white/30 text-center">
            {energy < state.multiTap
              ? t("tap.noEnergy", "No energy — wait for regen...")
              : t("tap.tapHint", "Tap the brain to earn BP!")}
          </div>

          {pendingTaps > 0 && (
            <div className="text-xs text-brain-accent/60">
              {pendingTaps} {t("tap.tapsPending", "taps queued...")}
            </div>
          )}
        </div>
      )}

      {/* UPGRADES TAB */}
      {activeTab === "upgrades" && (
        <TapUpgradeShop levels={state.levels} onBought={handleUpgradeBought} />
      )}

      {/* BOSS TAB */}
      {activeTab === "boss" && (
        <BossCard boss={state.boss} energy={energy} tapPower={state.tapPower} onBossHit={() => {
          api.get<{ data: TapperState }>("/tapper/me").then((res) => {
            setState(res.data);
            stateRef.current = res.data;
            setEnergy(res.data.energy);
          });
        }} />
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === "leaderboard" && <TapLeaderboard />}

      {/* Prestige button */}
      {state.totalTaps >= 1_000_000 && (
        <div className="glass-panel rounded-2xl p-4 border border-yellow-500/30 text-center">
          <div className="text-2xl mb-1">✨</div>
          <div className="font-bold text-yellow-400 mb-1">{t("tap.prestigeReady", "Prestige Available!")}</div>
          <div className="text-xs text-white/50 mb-3">{t("tap.prestigeDesc", "Reset upgrades for a permanent +10% bonus to all future earnings.")}</div>
          <button
            onClick={async () => {
              await api.post("/tapper/prestige", {});
              const res = await api.get<{ data: TapperState }>("/tapper/me");
              setState(res.data);
              stateRef.current = res.data;
              setEnergy(res.data.energy);
            }}
            className="bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/30 text-yellow-400 font-bold px-6 py-2 rounded-xl text-sm transition-colors"
          >
            {t("tap.prestige", "Prestige Now")}
          </button>
        </div>
      )}
    </div>
  );
}
