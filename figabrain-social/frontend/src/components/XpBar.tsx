import { motion } from "framer-motion";
import type { UserProfile } from "../api/types";
import { RANK_META } from "../lib/rankMeta";

export function XpBar({ xp, nextLevelTier }: Pick<UserProfile, "xp" | "nextLevelTier" | "rank">) {
  const progress = nextLevelTier ? Math.min(1, xp / nextLevelTier.minXp) : 1;

  return (
    <div>
      <div className="flex justify-between text-xs text-white/50 mb-1">
        <span>{xp} XP</span>
        <span>{nextLevelTier ? `${nextLevelTier.minXp} XP -> ${RANK_META[nextLevelTier.rank].label}` : "Max rank"}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brain-accent to-brain-accent2"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
