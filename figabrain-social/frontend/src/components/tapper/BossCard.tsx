import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";

interface Boss {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  reward: number;
  endsAt: string;
  myDamage: number;
}

interface Props {
  boss: Boss | null;
  energy: number;
  tapPower: number;
  onBossHit: () => void;
}

export function BossCard({ boss, energy, tapPower, onBossHit }: Props) {
  const { t } = useTranslation();
  const [hitting, setHitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ damage: number; killed: boolean; reward: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!boss) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-white/5">
        <div className="text-4xl mb-3">💤</div>
        <p className="text-white/40 text-sm">{t("tap.noBoss", "No boss active. Check back later!")}</p>
      </div>
    );
  }

  const hpPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
  const endsIn = Math.max(0, new Date(boss.endsAt).getTime() - Date.now());
  const hoursLeft = Math.floor(endsIn / 3_600_000);
  const minutesLeft = Math.floor((endsIn % 3_600_000) / 60_000);

  async function attack(taps: number) {
    if (!boss || energy < taps) return;
    setHitting(true);
    setError(null);
    try {
      const res = await api.post<{ data: { damage: number; killed: boolean; reward: number } }>(
        "/tapper/boss/tap",
        { bossId: boss.id, count: taps }
      );
      setLastResult(res.data);
      onBossHit();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("tap.attackFailed", "Attack failed"));
    } finally {
      setHitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-5 border border-red-500/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-red-400 text-xs font-semibold uppercase tracking-wider">{t("tap.dailyBoss", "Daily Boss")}</div>
            <div className="text-xl font-black">{boss.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40">{t("tap.endsIn", "Ends in")}</div>
            <div className="text-sm font-bold text-orange-400">{hoursLeft}h {minutesLeft}m</div>
          </div>
        </div>

        {/* HP bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>❤️ HP</span>
            <span>{boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()}</span>
          </div>
          <div className="h-4 bg-brain-800 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-white/40 mb-4">
          <span>🏆 Reward: <span className="text-brain-point font-bold">{boss.reward} BP</span> (shared)</span>
          {boss.myDamage > 0 && <span>Your DMG: <span className="text-brain-accent font-bold">{boss.myDamage.toLocaleString()}</span></span>}
        </div>

        {lastResult && (
          <div className={`text-sm font-bold text-center mb-3 ${lastResult.killed ? "text-yellow-400" : "text-brain-accent"}`}>
            {lastResult.killed
              ? `🎉 BOSS KILLED! +${lastResult.reward.toFixed(1)} BP`
              : `💥 Dealt ${lastResult.damage.toLocaleString()} damage!`}
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="grid grid-cols-3 gap-2">
          {[10, 50, 200].map((taps) => (
            <button
              key={taps}
              onClick={() => attack(taps)}
              disabled={hitting || energy < taps}
              className={`py-2.5 rounded-xl text-xs font-bold transition-colors border ${
                energy >= taps
                  ? "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                  : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              {hitting ? "..." : (
                <>
                  ⚔️ {taps} taps
                  <br />
                  <span className="text-[10px] opacity-60">~{taps * tapPower} DMG</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
