import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";
import type { LeaderboardEntry } from "../api/types";

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    api.get<{ data: LeaderboardEntry[] }>("/leaderboard").then((res) => setEntries(res.data));
  }, []);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6 items-end">
        {podium.map((entry, i) => (
          <motion.div
            key={entry.username}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-panel rounded-2xl p-4 text-center ${i === 0 ? "order-2 scale-110 shadow-glow" : i === 1 ? "order-1" : "order-3"}`}
          >
            <div className="text-2xl font-bold mb-1">#{entry.position}</div>
            <div className="font-semibold">{entry.displayName}</div>
            <div className="text-xs text-white/40">@{entry.username}</div>
            <div className="text-brain-point font-bold mt-2">{entry.brainPoints.toFixed(1)} BP</div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-2">
        {rest.map((entry) => (
          <div key={entry.username} className="glass-panel rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white/40 w-6 text-sm">#{entry.position}</span>
              <span className="font-medium text-sm">{entry.displayName}</span>
              <span className="text-xs text-white/30">@{entry.username}</span>
            </div>
            <span className="text-brain-point font-semibold text-sm">{entry.brainPoints.toFixed(1)} BP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
