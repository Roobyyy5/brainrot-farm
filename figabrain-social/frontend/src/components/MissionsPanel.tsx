import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Mission } from "../api/types";

export function MissionsPanel() {
  const [daily, setDaily] = useState<Mission[]>([]);
  const [weekly, setWeekly] = useState<Mission[]>([]);

  useEffect(() => {
    api.get<{ data: { daily: Mission[]; weekly: Mission[] } }>("/missions").then((res) => {
      setDaily(res.data.daily);
      setWeekly(res.data.weekly);
    });
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="font-bold mb-3">Місії</h2>
      <MissionGroup title="Щоденні" missions={daily} />
      <MissionGroup title="Щотижневі" missions={weekly} className="mt-4" />
    </div>
  );
}

function MissionGroup({ title, missions, className = "" }: { title: string; missions: Mission[]; className?: string }) {
  if (missions.length === 0) return null;
  return (
    <div className={className}>
      <div className="text-xs uppercase text-white/40 mb-2">{title}</div>
      <div className="space-y-2">
        {missions.map((mission) => {
          const progress = Math.min(1, mission.progress / mission.targetCount);
          return (
            <div key={mission.missionId} className={`rounded-xl p-3 ${mission.completed ? "bg-green-500/10 border border-green-500/30" : "bg-white/5"}`}>
              <div className="flex justify-between text-sm mb-1">
                <span className={mission.completed ? "text-green-400" : ""}>{mission.completed ? "✅ " : ""}{mission.title}</span>
                <span className="text-white/40">
                  {mission.progress}/{mission.targetCount}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brain-accent to-brain-accent2"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="text-xs text-white/40">
                +{mission.pointsReward} BP · +{mission.xpReward} XP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
