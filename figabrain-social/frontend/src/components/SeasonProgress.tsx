import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { SeasonCurrent } from "../api/types";
import { RANK_META } from "../lib/rankMeta";

function formatTimeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Завершується...";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${days}д ${hours}г залишилось`;
}

export function SeasonProgress() {
  const [data, setData] = useState<SeasonCurrent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showAll, setShowAll] = useState(false);

  function load() {
    api
      .get<{ data: SeasonCurrent }>("/seasons/current")
      .then((res) => setData(res.data))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function claimReward(seasonId: string) {
    setIsClaiming(true);
    try {
      await api.post(`/seasons/${seasonId}/claim`);
      load();
    } finally {
      setIsClaiming(false);
    }
  }

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-16 bg-white/5 rounded" />
      </div>
    );
  }

  if (!data || !data.season) {
    return (
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="font-bold mb-1">Сезон</h2>
        <p className="text-white/40 text-sm">Наразі немає активного сезону.</p>
      </div>
    );
  }

  const canClaim =
    data.season.status === "ENDED" &&
    data.me !== null &&
    data.me.finalRank !== null &&
    !data.me.rewardClaimed;

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="font-bold">{data.season.name}</h2>
        <span className="text-xs text-white/40">
          {data.season.status === "ENDED" ? "Завершено" : formatTimeLeft(data.season.endsAt)}
        </span>
      </div>

      {data.me && (
        <div className="bg-brain-accent/10 border border-brain-accent/30 rounded-xl p-3 mb-4 flex justify-between items-center">
          <div>
            <span className="text-sm text-white/60">Твій результат</span>
            {data.me.finalRank && (
              <span className="ml-2 text-xs text-white/40">#{data.me.finalRank}</span>
            )}
          </div>
          <span className="font-bold text-brain-point">{data.me.seasonPoints.toFixed(1)} BP</span>
        </div>
      )}

      {canClaim && (
        <button
          onClick={() => claimReward(data.season!.id)}
          disabled={isClaiming}
          className="w-full mb-4 bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-bold py-2 rounded-xl disabled:opacity-50"
        >
          {isClaiming ? "Отримання..." : "🎁 Отримати нагороду"}
        </button>
      )}

      {data.me?.rewardClaimed && (
        <p className="text-green-400 text-xs text-center mb-4">✓ Нагороду отримано</p>
      )}

      <div className="space-y-1">
        {(showAll ? data.leaderboard : data.leaderboard.slice(0, 10)).map((entry) => (
          <Link
            key={entry.user.username}
            to={`/u/${entry.user.username}`}
            className="flex items-center gap-2 text-sm py-1.5 px-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="w-5 text-white/40 text-xs font-mono shrink-0">{entry.position}</span>
            <span className="shrink-0">{RANK_META[entry.user.rank]?.emoji ?? "🧠"}</span>
            <span className="flex-1 truncate">{entry.user.displayName}</span>
            <span className="text-brain-point font-semibold text-xs">{entry.seasonPoints.toFixed(1)} BP</span>
          </Link>
        ))}
        {data.leaderboard.length === 0 && <p className="text-white/40 text-sm">No participants yet.</p>}
        {data.leaderboard.length > 10 && (
          <button onClick={() => setShowAll((v) => !v)} className="text-xs text-white/30 hover:text-white w-full text-center pt-1">
            {showAll ? "Show less" : `Show all ${data.leaderboard.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
