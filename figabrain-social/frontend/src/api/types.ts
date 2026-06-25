export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  rank: "NPC" | "NORMIE" | "SIGMA" | "GIGACHAD" | "BRAIN_LORD" | "MEME_EMPEROR" | "GALAXY_BRAIN" | "NEURAL_GOD";
  brainPoints: number;
  xp: number;
  reputation: number;
  walletAddress: string | null;
  walletBalance: number;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowedByMe?: boolean;
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
}

export interface NotificationItem {
  id: string;
  type: "LIKE" | "COMMENT" | "REPOST" | "FOLLOW" | "MENTION" | "REWARD" | "SYSTEM";
  message: string;
  isRead: boolean;
  createdAt: string;
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
