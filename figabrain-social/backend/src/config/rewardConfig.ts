export type RewardAction =
  | "LIKE"
  | "COMMENT"
  | "REPOST"
  | "DAILY_LOGIN"
  | "REFERRAL"
  | "POST_CREATED";

export interface RewardRule {
  action: RewardAction;
  amount: number;
  xpAmount: number;
  dailyCap: number | null;
  cooldownSeconds: number;
}

/**
 * Seed values for the Brain Points/XP reward engine. Persisted into
 * RewardConfig at seed time so admins can tune amounts at runtime without a
 * deploy; this object is only the fallback/default source of truth.
 */
export const DEFAULT_REWARD_RULES: Record<RewardAction, RewardRule> = {
  LIKE: { action: "LIKE", amount: 0.2, xpAmount: 1, dailyCap: 10, cooldownSeconds: 1 },
  COMMENT: { action: "COMMENT", amount: 0.5, xpAmount: 3, dailyCap: 25, cooldownSeconds: 5 },
  REPOST: { action: "REPOST", amount: 1, xpAmount: 4, dailyCap: 20, cooldownSeconds: 10 },
  DAILY_LOGIN: { action: "DAILY_LOGIN", amount: 5, xpAmount: 10, dailyCap: 5, cooldownSeconds: 0 },
  REFERRAL: { action: "REFERRAL", amount: 20, xpAmount: 30, dailyCap: null, cooldownSeconds: 0 },
  POST_CREATED: { action: "POST_CREATED", amount: 0.3, xpAmount: 5, dailyCap: 15, cooldownSeconds: 30 },
};
