import type { AchievementCategory, Rarity } from "@prisma/client";

export interface AchievementContext {
  postsCount: number;
  commentsCount: number;
  likesGiven: number;
  totalReferrals: number;
  loginStreak: number;
  reputation: number;
}

export interface AchievementSeed {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: Rarity;
  icon: string;
  xpReward: number;
  pointsReward: number;
}

/** Cheap, pure predicates evaluated against live AchievementContext after any rewarded action. */
export const ACHIEVEMENT_CHECKS: Record<string, (ctx: AchievementContext) => boolean> = {
  first_post: (ctx) => ctx.postsCount >= 1,
  prolific_poster: (ctx) => ctx.postsCount >= 50,
  content_legend: (ctx) => ctx.postsCount >= 500,
  first_like: (ctx) => ctx.likesGiven >= 1,
  social_butterfly: (ctx) => ctx.likesGiven >= 100,
  commentator: (ctx) => ctx.commentsCount >= 25,
  debate_champion: (ctx) => ctx.commentsCount >= 250,
  week_streak: (ctx) => ctx.loginStreak >= 7,
  month_streak: (ctx) => ctx.loginStreak >= 30,
  year_streak: (ctx) => ctx.loginStreak >= 365,
  networker: (ctx) => ctx.totalReferrals >= 1,
  recruiter: (ctx) => ctx.totalReferrals >= 10,
  community_pillar: (ctx) => ctx.totalReferrals >= 50,
  reputable: (ctx) => ctx.reputation >= 100,
  highly_trusted: (ctx) => ctx.reputation >= 500,
};

export const ACHIEVEMENT_CATALOG: AchievementSeed[] = [
  { key: "first_post", name: "First Post", description: "Published your first post", category: "CONTENT", rarity: "COMMON", icon: "📝", xpReward: 10, pointsReward: 5 },
  { key: "prolific_poster", name: "Prolific Poster", description: "Published 50 posts", category: "CONTENT", rarity: "RARE", icon: "🖋️", xpReward: 100, pointsReward: 50 },
  { key: "content_legend", name: "Content Legend", description: "Published 500 posts", category: "CONTENT", rarity: "MYTHIC", icon: "👑", xpReward: 1000, pointsReward: 1000 },
  { key: "first_like", name: "First Like", description: "Gave your first like", category: "SOCIAL", rarity: "COMMON", icon: "👍", xpReward: 5, pointsReward: 2 },
  { key: "social_butterfly", name: "Social Butterfly", description: "Gave 100 likes", category: "SOCIAL", rarity: "RARE", icon: "🦋", xpReward: 80, pointsReward: 40 },
  { key: "commentator", name: "Commentator", description: "Wrote 25 comments", category: "SOCIAL", rarity: "COMMON", icon: "💬", xpReward: 40, pointsReward: 20 },
  { key: "debate_champion", name: "Debate Champion", description: "Wrote 250 comments", category: "SOCIAL", rarity: "EPIC", icon: "🎙️", xpReward: 300, pointsReward: 150 },
  { key: "week_streak", name: "Week Streak", description: "Logged in 7 days in a row", category: "ACTIVITY", rarity: "COMMON", icon: "🔥", xpReward: 40, pointsReward: 25 },
  { key: "month_streak", name: "Month Streak", description: "Logged in 30 days in a row", category: "ACTIVITY", rarity: "EPIC", icon: "📅", xpReward: 200, pointsReward: 150 },
  { key: "year_streak", name: "Year Streak", description: "Logged in 365 days in a row", category: "ACTIVITY", rarity: "MYTHIC", icon: "🏆", xpReward: 3000, pointsReward: 3000 },
  { key: "networker", name: "Networker", description: "Referred your first friend", category: "REFERRAL", rarity: "COMMON", icon: "🤝", xpReward: 30, pointsReward: 20 },
  { key: "recruiter", name: "Recruiter", description: "Referred 10 friends", category: "REFERRAL", rarity: "RARE", icon: "📢", xpReward: 200, pointsReward: 100 },
  { key: "community_pillar", name: "Community Pillar", description: "Referred 50 friends", category: "REFERRAL", rarity: "LEGENDARY", icon: "🏛️", xpReward: 800, pointsReward: 500 },
  { key: "reputable", name: "Reputable", description: "Reached 100 reputation", category: "COMMUNITY", rarity: "RARE", icon: "⭐", xpReward: 120, pointsReward: 60 },
  { key: "highly_trusted", name: "Highly Trusted", description: "Reached 500 reputation", category: "COMMUNITY", rarity: "LEGENDARY", icon: "🛡️", xpReward: 500, pointsReward: 300 },
];
