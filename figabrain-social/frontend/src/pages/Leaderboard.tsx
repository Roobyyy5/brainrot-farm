import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { LeaderboardEntry } from "../api/types";

type Period = "alltime" | "weekly" | "daily";

export function Leaderboard() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<Period>("alltime");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get<{ data: LeaderboardEntry[] }>(`/leaderboard?period=${period}`)
      .then((res) => setEntries(res.data))
      .finally(() => setIsLoading(false));
  }, [period]);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const MEDALS = ["🥇", "🥈", "🥉"];

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3 mb-6 items-end">
          {[1, 0, 2].map((i) => (
            <div key={i} className={`glass-panel rounded-2xl p-4 h-32 ${i === 0 ? "scale-110" : ""}`} />
          ))}
        </div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-3 h-12" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Period tabs */}
      <div className="flex gap-1 mb-6">
        {(["alltime", "weekly", "daily"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              period === p ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {p === "alltime" ? "All time" : p === "weekly" ? "This week" : "Today"}
          </button>
        ))}
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-3 mb-6 items-end">
        {podium.map((entry, i) => (
          <motion.div
            key={entry.username}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-panel rounded-2xl p-4 text-center ${i === 0 ? "order-2 scale-110 shadow-glow" : i === 1 ? "order-1" : "order-3"}`}
          >
            <div className="text-3xl mb-1">{MEDALS[i]}</div>
            <Link to={`/u/${entry.username}`} className="font-semibold text-sm hover:underline block truncate">
              {entry.displayName}
            </Link>
            <div className="text-xs text-white/40 truncate">@{entry.username}</div>
            <div className="text-brain-point font-bold mt-2 text-sm">{entry.brainPoints.toFixed(1)} BP</div>
          </motion.div>
        ))}
      </div>

      {/* Rest of list */}
      <div className="space-y-2">
        {rest.map((entry) => (
          <Link
            key={entry.username}
            to={`/u/${entry.username}`}
            className="glass-panel rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition-colors block"
          >
            <div className="flex items-center gap-3">
              <span className="text-white/40 w-6 text-sm font-mono">#{entry.position}</span>
              {entry.avatarUrl ? (
                <img src={entry.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brain-accent/20 flex items-center justify-center text-xs font-bold">
                  {entry.displayName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-sm leading-tight">{entry.displayName}</div>
                <div className="text-xs text-white/30">@{entry.username}</div>
              </div>
            </div>
            <span className="text-brain-point font-semibold text-sm">{entry.brainPoints.toFixed(1)} BP</span>
          </Link>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-white/40 text-sm text-center mt-10">{t("leaderboard.loading")}</p>
      )}
    </div>
  );
}
