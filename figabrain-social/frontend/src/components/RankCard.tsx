import { useTranslation } from "react-i18next";
import type { UserProfile } from "../api/types";
import { RANK_META } from "../lib/rankMeta";
import { XpBar } from "./XpBar";

export function RankCard({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  const meta = RANK_META[profile.rank];

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-2xl"
          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}66` }}
        >
          {meta.emoji}
        </div>
        <div>
          <div className="font-bold" style={{ color: meta.color }}>
            {meta.label}
          </div>
          <div className="text-xs text-white/40">{t("rankCard.multiplier", { multiplier: meta.multiplier })}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-white/40">{t("profile.reputation")}</div>
          <div className="font-bold text-sm">⭐ {profile.reputation}</div>
        </div>
      </div>

      <XpBar xp={profile.xp} nextLevelTier={profile.nextLevelTier} rank={profile.rank} />

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-brain-point/10 border border-brain-point/30 rounded-xl p-3">
          <div className="text-xs text-white/50">{t("profile.brainPoints")}</div>
          <div className="text-lg font-bold text-brain-point">{profile.brainPoints.toFixed(2)}</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
          <div className="text-xs text-white/50">{t("profile.loginStreak")}</div>
          <div className="text-lg font-bold text-orange-400">🔥 {profile.loginStreak}d</div>
        </div>
      </div>
    </div>
  );
}
