import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";

interface Player {
  rank: number;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; rank: string };
  totalTaps?: number;
  tapsToday?: number;
  prestige?: number;
}

interface LeaderboardData {
  allTime: Player[];
  daily: Player[];
}

export function TapLeaderboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [tab, setTab] = useState<"allTime" | "daily">("daily");

  useEffect(() => {
    api.get<{ data: LeaderboardData }>("/tapper/leaderboard").then((res) => setData(res.data));
  }, []);

  const RANK_MEDAL = ["🥇", "🥈", "🥉"];

  const rows = tab === "allTime" ? data?.allTime ?? [] : data?.daily ?? [];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 glass-panel rounded-xl p-1">
        <button
          onClick={() => setTab("daily")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === "daily" ? "bg-brain-accent text-white" : "text-white/40"}`}
        >
          📅 {t("tap.today", "Today")}
        </button>
        <button
          onClick={() => setTab("allTime")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === "allTime" ? "bg-brain-accent text-white" : "text-white/40"}`}
        >
          🏆 {t("tap.allTime", "All Time")}
        </button>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-3 animate-pulse h-12" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          {t("tap.noTappers", "No taps yet — be the first!")}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.user.id} className="glass-panel rounded-xl p-3 flex items-center gap-3">
              <span className="text-lg font-bold w-8 text-center shrink-0">
                {p.rank <= 3 ? RANK_MEDAL[p.rank - 1] : `#${p.rank}`}
              </span>
              {p.user.avatarUrl ? (
                <img src={p.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brain-accent/20 flex items-center justify-center text-sm font-bold">
                  {p.user.displayName[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.user.displayName}</div>
                <div className="text-xs text-white/30">@{p.user.username}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-brain-accent">
                  {(tab === "allTime" ? p.totalTaps : p.tapsToday)?.toLocaleString()} taps
                </div>
                {tab === "allTime" && (p.prestige ?? 0) > 0 && (
                  <div className="text-[10px] text-yellow-400">✨ Prestige {p.prestige}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
