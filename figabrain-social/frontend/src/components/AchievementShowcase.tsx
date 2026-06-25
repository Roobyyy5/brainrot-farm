import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";
import type { AchievementItem } from "../api/types";
import { RARITY_META } from "../lib/rankMeta";

export function AchievementShowcase() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);

  useEffect(() => {
    api.get<{ data: AchievementItem[] }>("/achievements").then((res) => setAchievements(res.data));
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold">Досягнення</h2>
        <span className="text-xs text-white/40">
          {unlockedCount}/{achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {achievements.map((achievement) => {
          const rarity = RARITY_META[achievement.rarity];
          return (
            <motion.div
              key={achievement.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              title={`${achievement.name} - ${achievement.description}`}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2 ${
                achievement.unlocked ? "" : "opacity-30"
              }`}
              style={{
                background: achievement.unlocked ? `${rarity.color}1a` : "rgba(255,255,255,0.04)",
                border: `1px solid ${achievement.unlocked ? rarity.color + "66" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <span className="text-2xl">{achievement.icon}</span>
              <span className="text-[10px] mt-1 leading-tight text-white/70">{achievement.name}</span>
              <span className="text-[9px] mt-0.5" style={{ color: rarity.color }}>
                {rarity.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
