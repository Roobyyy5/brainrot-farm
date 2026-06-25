import { useEffect, useState } from "react";
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

  useEffect(() => {
    api.get<{ data: SeasonCurrent }>("/seasons/current").then((res) => setData(res.data));
  }, []);

  if (!data || !data.season) {
    return (
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="font-bold mb-1">Сезон</h2>
        <p className="text-white/40 text-sm">Наразі немає активного сезону.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="font-bold">{data.season.name}</h2>
        <span className="text-xs text-white/40">{formatTimeLeft(data.season.endsAt)}</span>
      </div>

      {data.me && (
        <div className="bg-brain-accent/10 border border-brain-accent/30 rounded-xl p-3 mb-4 flex justify-between">
          <span className="text-sm text-white/60">Твій результат</span>
          <span className="font-bold text-brain-point">{data.me.seasonPoints.toFixed(1)} BP</span>
        </div>
      )}

      <div className="space-y-1.5">
        {data.leaderboard.slice(0, 10).map((entry) => (
          <div key={entry.user.username} className="flex items-center gap-2 text-sm py-1">
            <span className="w-5 text-white/40">{entry.position}</span>
            <span>{RANK_META[entry.user.rank].emoji}</span>
            <span className="flex-1 truncate">{entry.user.displayName}</span>
            <span className="text-brain-point font-semibold">{entry.seasonPoints.toFixed(1)}</span>
          </div>
        ))}
        {data.leaderboard.length === 0 && <p className="text-white/40 text-sm">Ще немає учасників цього сезону.</p>}
      </div>
    </div>
  );
}
