export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  language: string;
  rank: Rank;
  brainPoints: number;
  xp: number;
  reputation: number;
  loginStreak: number;
  longestStreak: number;
  nextLevelTier: { rank: Rank; minXp: number; multiplier: number } | null;
  walletAddress: string | null;
  walletBalance: number;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowedByMe?: boolean;
}

export type Rank = "NPC" | "NORMIE" | "SIGMA" | "GIGACHAD" | "BRAIN_LORD" | "MEME_EMPEROR" | "GALAXY_BRAIN" | "NEURAL_GOD";

export interface Mission {
  missionId: string;
  key: string;
  period: "DAILY" | "WEEKLY";
  title: string;
  description: string;
  targetCount: number;
  progress: number;
  completed: boolean;
  xpReward: number;
  pointsReward: number;
}

export type AchievementRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

export interface AchievementItem {
  key: string;
  name: string;
  description: string;
  category: "SOCIAL" | "CONTENT" | "COMMUNITY" | "REFERRAL" | "ACTIVITY";
  rarity: AchievementRarity;
  icon: string;
  xpReward: number;
  pointsReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progressValue: number | null;
  progressMax: number | null;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  nextMilestone: number | null;
}

export interface SeasonInfo {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: "ACTIVE" | "ENDED";
}

export interface SeasonLeaderboardEntry {
  position: number;
  seasonPoints: number;
  seasonXp: number;
  finalRank: number | null;
  user: { username: string; displayName: string; avatarUrl: string | null; rank: Rank };
}

export interface SeasonCurrent {
  season: SeasonInfo | null;
  leaderboard: SeasonLeaderboardEntry[];
  me: { seasonPoints: number; seasonXp: number; finalRank: number | null; rewardClaimed: boolean } | null;
}

export interface UserLootBoxItem {
  id: string;
  lootBox: { key: string; name: string; rarity: AchievementRarity };
  source: string;
  opened: boolean;
  openedAt: string | null;
  rewardJson: { pointsAwarded: number; xpAwarded: number; boosterKey: string | null } | null;
}

export interface ActiveBooster {
  type: "BRAIN_POINTS_MULTIPLIER" | "XP_MULTIPLIER" | "REFERRAL_BOOST";
  multiplier: number;
  source: string;
  expiresAt: string;
  booster: { key: string; name: string; rarity: AchievementRarity };
}

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rank: UserProfile["rank"];
}

export interface Post {
  id: string;
  content: string;
  imageUrls: string[];
  linkUrl: string | null;
  gifUrl: string | null;
  createdAt: string;
  author: PostAuthor;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  likedByMe: boolean;
  bookmarkedByMe?: boolean;
  tipsTotal?: number;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null; rank: UserProfile["rank"] };
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
}

export interface NotificationItem {
  id: string;
  type: "LIKE" | "COMMENT" | "REPOST" | "FOLLOW" | "MENTION" | "REWARD" | "SYSTEM";
  message: string;
  isRead: boolean;
  createdAt: string;
  postId?: string | null;
  actor: { username: string; displayName: string; avatarUrl: string | null } | null;
}

export interface LeaderboardEntry {
  position: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rank: UserProfile["rank"];
  brainPoints: number;
}

export interface RewardConfigEntry {
  id: string;
  action: string;
  amount: string;
  dailyCap: string | null;
  cooldownSeconds: number;
  enabled: boolean;
}

export interface WalletInfo {
  address: string;
  publicKey: string;
  chain: "TON" | "SOLANA";
  tokenBalance: number;
  brainPoints: number;
  createdAt: string;
}

export interface Story {
  id: string;
  content: string;
  imageUrl: string | null;
  expiresAt: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  viewedByMe: boolean;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: string;
  endsAt: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
  _count?: { votes: number };
  tally?: Record<string, number>;
  myVote?: string | null;
}

export interface TrendingHashtag {
  tag: string;
  count: number;
}

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}
