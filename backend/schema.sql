CREATE TABLE IF NOT EXISTS users (
  telegram_id     TEXT PRIMARY KEY,
  username        TEXT,
  coins           INTEGER NOT NULL DEFAULT 0,
  level           TEXT NOT NULL DEFAULT 'NPC',
  last_farm_at    INTEGER NOT NULL DEFAULT 0,
  last_daily_at   INTEGER NOT NULL DEFAULT 0,
  daily_streak    INTEGER NOT NULL DEFAULT 0,
  referral_code   TEXT UNIQUE NOT NULL,
  referred_by     TEXT,
  has_farmed_once INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (referred_by) REFERENCES users(telegram_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id     TEXT NOT NULL,
  referred_id     TEXT NOT NULL UNIQUE,
  signup_bonus_paid  INTEGER NOT NULL DEFAULT 0,
  active_bonus_paid  INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (referrer_id) REFERENCES users(telegram_id),
  FOREIGN KEY (referred_id) REFERENCES users(telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
