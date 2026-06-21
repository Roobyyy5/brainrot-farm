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

ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS referrals (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  referrer_id       TEXT NOT NULL REFERENCES users(telegram_id),
  referred_id       TEXT NOT NULL UNIQUE REFERENCES users(telegram_id),
  signup_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE,
  active_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT,
  event_type  TEXT NOT NULL,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_telegram_id ON events(telegram_id);
