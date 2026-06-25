import type { AchievementRarity, Rank } from "../api/types";

export const RANK_META: Record<Rank, { label: string; emoji: string; multiplier: number; color: string }> = {
  NPC: { label: "NPC", emoji: "🥚", multiplier: 1, color: "#8a8f9c" },
  NORMIE: { label: "Normie", emoji: "🙂", multiplier: 1, color: "#9ca3ff" },
  SIGMA: { label: "Sigma", emoji: "🐺", multiplier: 1.2, color: "#7c5cff" },
  GIGACHAD: { label: "Gigachad", emoji: "💪", multiplier: 1.5, color: "#22d3ee" },
  BRAIN_LORD: { label: "Brain Lord", emoji: "🧠", multiplier: 2, color: "#ffd166" },
  MEME_EMPEROR: { label: "Meme Emperor", emoji: "👑", multiplier: 3, color: "#ff7c7c" },
  GALAXY_BRAIN: { label: "Galaxy Brain", emoji: "🌌", multiplier: 4, color: "#c084fc" },
  NEURAL_GOD: { label: "Neural God", emoji: "⚡", multiplier: 5, color: "#f472b6" },
};

export const RARITY_META: Record<AchievementRarity, { label: string; color: string }> = {
  COMMON: { label: "Common", color: "#9ca3af" },
  RARE: { label: "Rare", color: "#60a5fa" },
  EPIC: { label: "Epic", color: "#c084fc" },
  LEGENDARY: { label: "Legendary", color: "#ffd166" },
  MYTHIC: { label: "Mythic", color: "#ff5c8a" },
};
