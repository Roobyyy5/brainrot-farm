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
ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_coins BIGINT NOT NULL DEFAULT 0;

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

CREATE TABLE IF NOT EXISTS achievements (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id      TEXT NOT NULL REFERENCES users(telegram_id),
  achievement_key  TEXT NOT NULL,
  created_at       BIGINT NOT NULL,
  UNIQUE (telegram_id, achievement_key)
);

-- Singleton row tracking when the current weekly season ends.
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS season_history (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ended_at   BIGINT NOT NULL,
  top_users  JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
CREATE INDEX IF NOT EXISTS idx_users_weekly_coins ON users(weekly_coins DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_telegram_id ON events(telegram_id);
CREATE INDEX IF NOT EXISTS idx_achievements_telegram_id ON achievements(telegram_id);

-- Tapper system
CREATE TABLE IF NOT EXISTS tapper_profiles (
  telegram_id      TEXT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  energy           INTEGER NOT NULL DEFAULT 1000,
  last_energy_at   BIGINT  NOT NULL DEFAULT 0,
  tap_power_level  INTEGER NOT NULL DEFAULT 0,
  energy_max_level INTEGER NOT NULL DEFAULT 0,
  regen_rate_level INTEGER NOT NULL DEFAULT 0,
  multi_tap_level  INTEGER NOT NULL DEFAULT 0,
  auto_brain_level INTEGER NOT NULL DEFAULT 0,
  total_taps       BIGINT  NOT NULL DEFAULT 0,
  total_bp_earned  BIGINT  NOT NULL DEFAULT 0,
  prestige         INTEGER NOT NULL DEFAULT 0,
  last_seen_at     BIGINT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tap_batches (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id  TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  tap_count    INTEGER NOT NULL,
  bp_earned    INTEGER NOT NULL,
  created_at   BIGINT  NOT NULL
);

CREATE TABLE IF NOT EXISTS boss_fights (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT    NOT NULL,
  hp         INTEGER NOT NULL,
  max_hp     INTEGER NOT NULL,
  reward     INTEGER NOT NULL,
  starts_at  BIGINT  NOT NULL,
  ends_at    BIGINT  NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT  NOT NULL
);

CREATE TABLE IF NOT EXISTS boss_participants (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  boss_id     INTEGER NOT NULL REFERENCES boss_fights(id) ON DELETE CASCADE,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  damage      INTEGER NOT NULL DEFAULT 0,
  rewarded    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (boss_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_tapper_total_taps ON tapper_profiles(total_taps DESC);
CREATE INDEX IF NOT EXISTS idx_tap_batches_user_time ON tap_batches(telegram_id, created_at);
CREATE INDEX IF NOT EXISTS idx_boss_fights_active ON boss_fights(ends_at, completed);
CREATE INDEX IF NOT EXISTS idx_boss_participants_boss ON boss_participants(boss_id, damage DESC);

-- Brain Gems currency
ALTER TABLE users ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 0;

-- Passive income cards catalog
CREATE TABLE IF NOT EXISTS passive_cards (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  icon        TEXT NOT NULL,
  description TEXT NOT NULL,
  base_income INTEGER NOT NULL,
  income_step INTEGER NOT NULL,
  costs       INTEGER[] NOT NULL,
  max_level   INTEGER NOT NULL DEFAULT 10
);

-- User's purchased passive cards
CREATE TABLE IF NOT EXISTS user_cards (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  card_key    TEXT    NOT NULL REFERENCES passive_cards(key),
  level       INTEGER NOT NULL DEFAULT 1,
  bought_at   BIGINT  NOT NULL,
  UNIQUE (telegram_id, card_key)
);

-- Daily wheel spin history (one free spin per day)
CREATE TABLE IF NOT EXISTS wheel_spins (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  spun_at     BIGINT  NOT NULL,
  prize_type  TEXT    NOT NULL,
  prize_value INTEGER NOT NULL,
  prize_index INTEGER NOT NULL DEFAULT 0
);

-- Daily mission claims (one claim per mission per day)
CREATE TABLE IF NOT EXISTS mission_claims (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  mission_key TEXT    NOT NULL,
  reward      INTEGER NOT NULL,
  date_key    TEXT    NOT NULL,
  claimed_at  BIGINT  NOT NULL,
  UNIQUE (telegram_id, mission_key, date_key)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user    ON user_cards(telegram_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_user   ON wheel_spins(telegram_id, spun_at);
CREATE INDEX IF NOT EXISTS idx_mission_claims_user ON mission_claims(telegram_id, date_key);

-- Tap streak & skins
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS tap_streak       INTEGER  NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS last_tap_date    TEXT     NOT NULL DEFAULT '';
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS selected_skin    TEXT     NOT NULL DEFAULT 'default';
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS skins_unlocked   TEXT[]   NOT NULL DEFAULT '{}';
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS energy_notif_at  BIGINT   NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS energy_notif_sent BOOLEAN NOT NULL DEFAULT TRUE;

-- Active boosts (e.g. 2× tap power for N minutes)
CREATE TABLE IF NOT EXISTS user_boosts (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id  TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  boost_type   TEXT    NOT NULL,
  expires_at   BIGINT  NOT NULL,
  activated_at BIGINT  NOT NULL
);

-- Boss spawn notification flag
ALTER TABLE boss_fights ADD COLUMN IF NOT EXISTS notif_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_boosts_user ON user_boosts(telegram_id, expires_at);
