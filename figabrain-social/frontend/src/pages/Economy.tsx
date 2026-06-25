import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ActiveBooster } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { RankCard } from "../components/RankCard";
import { MissionsPanel } from "../components/MissionsPanel";
import { AchievementShowcase } from "../components/AchievementShowcase";
import { SeasonProgress } from "../components/SeasonProgress";
import { LootBoxShelf } from "../components/LootBoxShelf";

export function Economy() {
  const { user } = useAuth();
  const [boosters, setBoosters] = useState<ActiveBooster[]>([]);
  const [boostersLoading, setBoostersLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: ActiveBooster[] }>("/boosters")
      .then((res) => setBoosters(res.data))
      .finally(() => setBoostersLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <RankCard profile={user} />

      {boostersLoading ? (
        <div className="glass-panel rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
          <div className="h-8 bg-white/5 rounded-full w-40" />
        </div>
      ) : boosters.length > 0 ? (
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="font-bold mb-3">Активні бустери</h2>
          <div className="flex flex-wrap gap-2">
            {boosters.map((b, i) => (
              <span key={i} className="bg-brain-accent/15 border border-brain-accent/40 rounded-full px-3 py-1 text-xs font-semibold">
                {b.booster.name} · x{b.multiplier} · до {new Date(b.expiresAt).toLocaleTimeString()}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <LootBoxShelf />
      <MissionsPanel />
      <AchievementShowcase />
      <SeasonProgress />
    </div>
  );
}
