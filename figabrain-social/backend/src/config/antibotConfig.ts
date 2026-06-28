/**
 * Anti-bot system configuration.
 * All thresholds are read from environment variables with sensible defaults,
 * making them adjustable without a redeploy.
 */

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

export const ANTIBOT_CONFIG = {
  /** Devices sharing > this many accounts trigger shadow-ban */
  MULTI_ACCOUNT_DEVICE_THRESHOLD: envInt("ANTIBOT_MULTI_ACCOUNT_THRESHOLD", 3),

  /** Time window for duplicate post detection (ms) */
  DUPLICATE_CONTENT_WINDOW_MS: envInt("ANTIBOT_DUPLICATE_WINDOW_MS", 10 * 60_000),

  /** Time window for reward velocity check (ms) */
  REWARD_VELOCITY_WINDOW_MS: envInt("ANTIBOT_REWARD_WINDOW_MS", 5 * 60_000),

  /** Max reward events allowed within REWARD_VELOCITY_WINDOW_MS */
  REWARD_VELOCITY_THRESHOLD: envInt("ANTIBOT_REWARD_VELOCITY_THRESHOLD", 60),

  /** Time window for post velocity check (ms) */
  POST_VELOCITY_WINDOW_MS: envInt("ANTIBOT_POST_WINDOW_MS", 60 * 60_000),

  /** Max posts allowed within POST_VELOCITY_WINDOW_MS */
  POST_VELOCITY_THRESHOLD: envInt("ANTIBOT_POST_VELOCITY_THRESHOLD", 30),

  /** Reputation below this value contributes a suspicious flag */
  LOW_REPUTATION_THRESHOLD: envInt("ANTIBOT_LOW_REP_THRESHOLD", -50),

  /** Suspicious score >= this triggers auto shadow-ban */
  AUTO_SHADOW_BAN_SCORE_THRESHOLD: envInt("ANTIBOT_SHADOW_BAN_SCORE", 50),

  /** Cooldown in seconds between any rewarded action (per action type, not global) */
  COOLDOWN_SYSTEM_ENABLED: process.env["ANTIBOT_COOLDOWN_ENABLED"] !== "false",

  /**
   * Per-action override cooldowns (seconds). If not set, the per-action
   * RewardConfig.cooldownSeconds is used. Useful for emergency throttling.
   */
  ACTION_COOLDOWN_OVERRIDES: {
    LIKE:         envInt("ANTIBOT_CD_LIKE", 0),
    COMMENT:      envInt("ANTIBOT_CD_COMMENT", 0),
    REPOST:       envInt("ANTIBOT_CD_REPOST", 0),
    DAILY_LOGIN:  envInt("ANTIBOT_CD_DAILY_LOGIN", 0),
    POST_CREATED: envInt("ANTIBOT_CD_POST_CREATED", 0),
  },
} as const;
