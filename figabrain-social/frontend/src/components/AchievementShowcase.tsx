import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { AchievementItem } from "../api/types";
import { RARITY_META } from "../lib/rankMeta";

export function AchievementShowcase() {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: AchievementItem[] }>("/achievements").then((res) => setAchievements(res.data));
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold">{t("economy.achievements", "Achievements")}</h2>
        <span className="text-xs text-white/40">
          {unlockedCount}/{achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {achievements.map((achievement) => {
          const rarity = RARITY_META[achievement.rarity];
          const pct =
            !achievement.unlocked && achievement.progressValue !== null && achievement.progressMax
              ? Math.round((achievement.progressValue / achievement.progressMax) * 100)
              : null;
          return (
            <motion.div
              key={achievement.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onHoverStart={() => setHovered(achievement.key)}
              onHoverEnd={() => setHovered(null)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2 cursor-default ${
                achievement.unlocked ? "" : "opacity-40"
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

              {/* Progress bar for locked achievements */}
              {!achievement.unlocked && pct !== null && (
                <div className="absolute bottom-1.5 left-2 right-2 h-[3px] bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: rarity.color }}
                  />
                </div>
              )}

              {/* Tooltip on hover */}
              {hovered === achievement.key && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-44 bg-brain-900 border border-white/10 rounded-xl p-2 text-left pointer-events-none shadow-xl">
                  <p className="text-xs font-semibold text-white">{achievement.name}</p>
                  <p className="text-[10px] text-white/50 mt-0.5 leading-snug">{achievement.description}</p>
                  {!achievement.unlocked && pct !== null && (
                    <p className="text-[10px] text-white/40 mt-1">
                      {achievement.progressValue} / {achievement.progressMax} ({pct}%)
                    </p>
                  )}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-[10px] text-green-400 mt-1">
                      ✓ {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
