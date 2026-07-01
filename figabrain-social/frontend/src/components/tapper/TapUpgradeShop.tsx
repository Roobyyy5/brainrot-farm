import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

interface Upgrade {
  type: string;
  label: string;
  description: string;
  unit: string;
  currentLevel: number;
  maxLevel: number;
  currentEffect: number;
  nextEffect: number | null;
  cost: number | null;
  isMaxed: boolean;
}

interface Props {
  levels?: Record<string, number>;
  onBought: () => void;
}

const UPGRADE_ICONS: Record<string, string> = {
  TAP_POWER: "⚡",
  ENERGY_MAX: "🔋",
  REGEN_RATE: "♻️",
  MULTI_TAP: "✌️",
  AUTO_BRAIN: "🤖",
};

export function TapUpgradeShop({ onBought }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Upgrade[] }>("/tapper/upgrades").then((res) => setUpgrades(res.data));
  }, []);

  async function handleBuy(type: string, cost: number) {
    if (!user || user.brainPoints < cost) {
      setError(t("tap.insufficientBP", "Not enough Brain Points"));
      return;
    }
    setBuying(type);
    setError(null);
    try {
      await api.post("/tapper/upgrade", { type });
      const res = await api.get<{ data: Upgrade[] }>("/tapper/upgrades");
      setUpgrades(res.data);
      onBought();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("tap.upgradeFailed", "Upgrade failed"));
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-lg">{t("tap.upgradeTitle", "Upgrade Shop")}</h2>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {upgrades.map((upg) => {
        const canAfford = !upg.isMaxed && upg.cost !== null && (user?.brainPoints ?? 0) >= upg.cost;
        const icon = UPGRADE_ICONS[upg.type] ?? "⬆️";

        return (
          <div
            key={upg.type}
            className={`glass-panel rounded-xl p-4 border transition-colors ${
              upg.isMaxed
                ? "border-yellow-500/30 bg-yellow-500/5"
                : canAfford
                ? "border-brain-accent/30 hover:border-brain-accent/50"
                : "border-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{upg.label}</span>
                    <span className="text-xs text-white/30">
                      Lv {upg.currentLevel}/{upg.maxLevel}
                    </span>
                    {upg.isMaxed && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">MAX</span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">{upg.description}</div>
                  <div className="text-xs text-white/60 mt-0.5">
                    <span className="text-brain-accent font-semibold">{upg.currentEffect} {upg.unit}</span>
                    {upg.nextEffect !== null && (
                      <span className="text-white/30"> → {upg.nextEffect} {upg.unit}</span>
                    )}
                  </div>
                </div>
              </div>

              {!upg.isMaxed && upg.cost !== null ? (
                <button
                  onClick={() => handleBuy(upg.type, upg.cost!)}
                  disabled={!canAfford || buying === upg.type}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    canAfford
                      ? "bg-brain-accent/20 hover:bg-brain-accent/40 text-brain-accent border border-brain-accent/40"
                      : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                  }`}
                >
                  {buying === upg.type ? "..." : (
                    <span>
                      {upg.cost.toLocaleString()} <span className="text-brain-point">BP</span>
                    </span>
                  )}
                </button>
              ) : (
                <span className="text-lg">👑</span>
              )}
            </div>

            {/* Level progress dots */}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: upg.maxLevel }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < upg.currentLevel ? "bg-brain-accent" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
