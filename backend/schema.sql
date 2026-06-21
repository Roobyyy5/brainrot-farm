CREATE TABLE IF NOT EXISTS users (
  telegram_id     TEXT PRIMARY KEY,
  username        TEXT,
  coins           BIGINT NOT NULL DEFAULT 0,
  level           TEXT NOT NULL DEFAULT 'NPC',
  last_farm_at    BIGINT NOT NULL DEFAULT 0,
  last_daily_at   BIGINT NOT NULL DEFAULT 0,
  daily_streak    INTEGER NOT NULL DEFAULT 0,
  referral_code   TEXT UNIQUE NOT NULL,
  referred_by     TEXT REFERENCES users(telegram_id),
  has_farmed_once BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS referrals (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  referrer_id       TEXT NOT NULL REFERENCES users(telegram_id),
  referred_id       TEXT NOT NULL UNIQUE REFERENCES users(telegram_id),
  signup_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE,
  active_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
