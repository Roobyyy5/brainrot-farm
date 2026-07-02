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

-- ── Round 4: Skill Tree ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_skills (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  skill_key   TEXT    NOT NULL,
  level       INTEGER NOT NULL DEFAULT 1,
  UNIQUE (telegram_id, skill_key)
);
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS skill_points   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS talent_points  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS talents_chosen TEXT[]  NOT NULL DEFAULT '{}';

-- ── Round 4: Battle Pass ──────────────────────────────────────────────────────
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS bp_xp     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS bp_premium BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS battle_pass_claims (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  season      INTEGER NOT NULL,
  level       INTEGER NOT NULL,
  is_premium  BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at  BIGINT  NOT NULL,
  UNIQUE (telegram_id, season, level, is_premium)
);

-- ── Round 4: Login Streak ─────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TEXT    NOT NULL DEFAULT '';

-- ── Round 4: Guilds ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guilds (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  tag         TEXT    NOT NULL UNIQUE,
  owner_id    TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  description TEXT    NOT NULL DEFAULT '',
  level       INTEGER NOT NULL DEFAULT 1,
  xp          BIGINT  NOT NULL DEFAULT 0,
  created_at  BIGINT  NOT NULL
);
CREATE TABLE IF NOT EXISTS guild_members (
  id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guild_id             INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  telegram_id          TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  role                 TEXT    NOT NULL DEFAULT 'member',
  weekly_contribution  BIGINT  NOT NULL DEFAULT 0,
  joined_at            BIGINT  NOT NULL,
  UNIQUE (telegram_id)
);
CREATE TABLE IF NOT EXISTS guild_boss_fights (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guild_id    INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  hp          BIGINT  NOT NULL,
  max_hp      BIGINT  NOT NULL,
  reward_gems INTEGER NOT NULL DEFAULT 0,
  ends_at     BIGINT  NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  BIGINT  NOT NULL
);
CREATE TABLE IF NOT EXISTS guild_boss_hits (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fight_id    INTEGER NOT NULL REFERENCES guild_boss_fights(id) ON DELETE CASCADE,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  damage      BIGINT  NOT NULL DEFAULT 0,
  rewarded    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (fight_id, telegram_id)
);

-- ── Round 4: Tap Duels ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tap_duels (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  challenger_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  opponent_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  stake_gems    INTEGER NOT NULL DEFAULT 5,
  challenger_bp BIGINT  NOT NULL DEFAULT 0,
  opponent_bp   BIGINT  NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'pending',
  winner_id     TEXT,
  starts_at     BIGINT,
  ends_at       BIGINT,
  created_at    BIGINT  NOT NULL
);

-- ── Round 4: Daily Shop ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_shop_purchases (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  item_key    TEXT    NOT NULL,
  date_key    TEXT    NOT NULL,
  bought_at   BIGINT  NOT NULL,
  UNIQUE (telegram_id, item_key, date_key)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user         ON user_skills(telegram_id);
CREATE INDEX IF NOT EXISTS idx_bp_claims_user           ON battle_pass_claims(telegram_id, season);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild      ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_boss_fights_guild  ON guild_boss_fights(guild_id, completed);
CREATE INDEX IF NOT EXISTS idx_tap_duels_players        ON tap_duels(challenger_id, opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_shop_purchases     ON daily_shop_purchases(telegram_id, date_key);

-- ── Round 5: Pets ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_pets (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  pet_key     TEXT    NOT NULL,
  acquired_at BIGINT  NOT NULL,
  UNIQUE (telegram_id, pet_key)
);
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS active_pet     TEXT         NOT NULL DEFAULT '';
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS max_combo      NUMERIC(6,2) NOT NULL DEFAULT 1.0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS max_combo_week TEXT         NOT NULL DEFAULT '';
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS current_zone   INTEGER      NOT NULL DEFAULT 1;

-- ── Round 5: Guild Wars (weekly guild tap-damage competition) ─────────────────
CREATE TABLE IF NOT EXISTS guild_wars (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_week INTEGER NOT NULL,
  guild_id    INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  war_score   BIGINT  NOT NULL DEFAULT 0,
  UNIQUE (season_week, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pets_user  ON user_pets(telegram_id);
CREATE INDEX IF NOT EXISTS idx_guild_wars_week ON guild_wars(season_week, war_score DESC);

-- ── Round 6: Tournament ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT    NOT NULL,
  starts_at  BIGINT  NOT NULL,
  ends_at    BIGINT  NOT NULL,
  prize_skin TEXT    NOT NULL DEFAULT '',
  settled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT  NOT NULL
);
CREATE TABLE IF NOT EXISTS tournament_scores (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  telegram_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  score         BIGINT  NOT NULL DEFAULT 0,
  UNIQUE (tournament_id, telegram_id)
);

-- ── Round 6: Prestige Shop ─────────────────────────────────────────────────────
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS prestige_tokens INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS prestige_upgrades (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  upgrade_key TEXT    NOT NULL,
  level       INTEGER NOT NULL DEFAULT 1,
  UNIQUE (telegram_id, upgrade_key)
);

-- ── Round 6: Boss Rush ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boss_rush_sessions (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id  TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  current_wave INTEGER NOT NULL DEFAULT 1,
  boss_hp      BIGINT  NOT NULL DEFAULT 0,
  boss_max_hp  BIGINT  NOT NULL DEFAULT 0,
  boss_name    TEXT    NOT NULL DEFAULT '',
  score        BIGINT  NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'active',
  started_at   BIGINT  NOT NULL,
  ended_at     BIGINT
);

-- ── Round 6: Inventory ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_inventory (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  item_key    TEXT    NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  UNIQUE (telegram_id, item_key)
);

-- ── Round 6: Guild Chat ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_messages (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guild_id    INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  username    TEXT,
  message     TEXT    NOT NULL,
  created_at  BIGINT  NOT NULL
);

-- ── Round 6: Friends ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friends (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  friend_id  TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  status     TEXT    NOT NULL DEFAULT 'pending',
  created_at BIGINT  NOT NULL,
  UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_scores      ON tournament_scores(tournament_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_boss_rush_user         ON boss_rush_sessions(telegram_id, status);
CREATE INDEX IF NOT EXISTS idx_guild_messages_guild   ON guild_messages(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friends_user           ON friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_prestige_upgrades_user ON prestige_upgrades(telegram_id);

-- ── Round 7: Tap Rush ─────────────────────────────────────────────────────────
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS rush_active_until BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS rush_cooldown_at  BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS rush_week_score   BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS rush_week_key     TEXT   NOT NULL DEFAULT '';
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS tapper_season     INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS season_bp         BIGINT  NOT NULL DEFAULT 0;

-- ── Round 7: World Boss ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS world_boss (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT    NOT NULL,
  hp         BIGINT  NOT NULL,
  max_hp     BIGINT  NOT NULL,
  starts_at  BIGINT  NOT NULL,
  ends_at    BIGINT  NOT NULL,
  settled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT  NOT NULL
);
CREATE TABLE IF NOT EXISTS world_boss_hits (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  boss_id     INTEGER NOT NULL REFERENCES world_boss(id) ON DELETE CASCADE,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  damage      BIGINT  NOT NULL DEFAULT 0,
  rewarded    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (boss_id, telegram_id)
);

-- ── Round 7: Guild Raid ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_raids (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guild_id     INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  current_wave INTEGER NOT NULL DEFAULT 1,
  boss_hp      BIGINT  NOT NULL DEFAULT 0,
  boss_max_hp  BIGINT  NOT NULL DEFAULT 0,
  boss_name    TEXT    NOT NULL DEFAULT '',
  total_damage BIGINT  NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'active',
  started_at   BIGINT  NOT NULL,
  ended_at     BIGINT
);
CREATE TABLE IF NOT EXISTS guild_raid_hits (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  raid_id     INTEGER NOT NULL REFERENCES guild_raids(id) ON DELETE CASCADE,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  damage      BIGINT  NOT NULL DEFAULT 0,
  UNIQUE (raid_id, telegram_id)
);

-- ── Round 7: Challenge Board ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_claims (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  challenge_key TEXT    NOT NULL,
  period_key    TEXT    NOT NULL,
  claimed_at    BIGINT  NOT NULL,
  UNIQUE (telegram_id, challenge_key, period_key)
);

-- ── Round 7: Season Trophies ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS season_trophies (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  season_num  INTEGER NOT NULL,
  rank        INTEGER NOT NULL,
  bp_earned   BIGINT  NOT NULL DEFAULT 0,
  trophy_icon TEXT    NOT NULL DEFAULT '🏆',
  awarded_at  BIGINT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_world_boss_active ON world_boss(settled, ends_at);
CREATE INDEX IF NOT EXISTS idx_world_boss_hits   ON world_boss_hits(boss_id, damage DESC);
CREATE INDEX IF NOT EXISTS idx_guild_raids_guild ON guild_raids(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_guild_raid_hits   ON guild_raid_hits(raid_id, damage DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_claims  ON challenge_claims(telegram_id, period_key);
CREATE INDEX IF NOT EXISTS idx_season_trophies   ON season_trophies(telegram_id);

-- ── Elite Layer 1: Active Abilities ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_ability_cooldowns (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  ability_key TEXT    NOT NULL,
  last_used_at BIGINT NOT NULL DEFAULT 0,
  UNIQUE (telegram_id, ability_key)
);
-- per-ability boost tracking stored in user_boosts with boost_type = ability key

-- ── Elite Layer 2: Server-side Combo ─────────────────────────────────────────
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS current_combo    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS combo_batches    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS last_batch_at    BIGINT  NOT NULL DEFAULT 0;

-- ── Elite Layer 3: World Boss Phases ─────────────────────────────────────────
ALTER TABLE world_boss ADD COLUMN IF NOT EXISTS phase      TEXT   NOT NULL DEFAULT 'normal';
ALTER TABLE world_boss ADD COLUMN IF NOT EXISTS rage_until BIGINT NOT NULL DEFAULT 0;
ALTER TABLE world_boss ADD COLUMN IF NOT EXISTS vuln_until BIGINT NOT NULL DEFAULT 0;

-- ── Elite Layer 4: Ascension ──────────────────────────────────────────────────
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS ascension_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS ascension_points INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS ascension_upgrades (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  upgrade_key TEXT    NOT NULL,
  level       INTEGER NOT NULL DEFAULT 1,
  UNIQUE (telegram_id, upgrade_key)
);

-- ── Elite Layer 5: ELO Ranked Duels ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_elo (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  elo         INTEGER NOT NULL DEFAULT 1000,
  league      TEXT    NOT NULL DEFAULT 'Rookie',
  season      INTEGER NOT NULL DEFAULT 1,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (telegram_id, season)
);
CREATE TABLE IF NOT EXISTS ranked_duels (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  challenger_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  opponent_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  season        INTEGER NOT NULL DEFAULT 1,
  challenger_bp BIGINT  NOT NULL DEFAULT 0,
  opponent_bp   BIGINT  NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'pending',
  winner_id     TEXT,
  starts_at     BIGINT,
  ends_at       BIGINT,
  created_at    BIGINT  NOT NULL
);

-- ── Elite Layer 6: Artifacts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_artifacts (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  artifact_key  TEXT    NOT NULL,
  rarity        TEXT    NOT NULL DEFAULT 'common',
  equipped_slot TEXT,
  acquired_at   BIGINT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_ability_cooldowns ON active_ability_cooldowns(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ascension_upgrades_user  ON ascension_upgrades(telegram_id);
CREATE INDEX IF NOT EXISTS idx_player_elo_season        ON player_elo(season, elo DESC);
CREATE INDEX IF NOT EXISTS idx_ranked_duels             ON ranked_duels(challenger_id, opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_user_artifacts           ON user_artifacts(telegram_id);

-- ── Layer 9: Clan War Bracket Tournament ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS clan_brackets (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_week INTEGER NOT NULL UNIQUE,
  status      TEXT    NOT NULL DEFAULT 'open',
  started_at  BIGINT  NOT NULL,
  ended_at    BIGINT
);
CREATE TABLE IF NOT EXISTS clan_bracket_entries (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bracket_id  INTEGER NOT NULL REFERENCES clan_brackets(id) ON DELETE CASCADE,
  guild_id    INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  guild_name  TEXT    NOT NULL DEFAULT '',
  seed        INTEGER NOT NULL DEFAULT 0,
  eliminated  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (bracket_id, guild_id)
);
CREATE TABLE IF NOT EXISTS clan_bracket_matches (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bracket_id  INTEGER NOT NULL REFERENCES clan_brackets(id) ON DELETE CASCADE,
  round       INTEGER NOT NULL DEFAULT 1,
  guild_a_id  INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  guild_b_id  INTEGER,
  score_a     BIGINT  NOT NULL DEFAULT 0,
  score_b     BIGINT  NOT NULL DEFAULT 0,
  winner_id   INTEGER,
  ends_at     BIGINT  NOT NULL,
  settled     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Layer 10: Mastery System ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upgrade_mastery (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  upgrade_key TEXT    NOT NULL,
  mastery_xp  INTEGER NOT NULL DEFAULT 0,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  UNIQUE (telegram_id, upgrade_key)
);

-- ── Layer 11: Tap Challenges ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tap_challenge_runs (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  challenge_key TEXT    NOT NULL,
  taps_done     INTEGER NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'active',
  started_at    BIGINT  NOT NULL,
  ended_at      BIGINT,
  gems_rewarded INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tap_challenge_records (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  challenge_key TEXT    NOT NULL,
  best_taps     INTEGER NOT NULL DEFAULT 0,
  best_time_ms  BIGINT,
  achieved_at   BIGINT  NOT NULL,
  UNIQUE (telegram_id, challenge_key)
);

-- ── Layer 12: Season Narrative progress ───────────────────────────────────────
ALTER TABLE tapper_profiles ADD COLUMN IF NOT EXISTS season_num INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_clan_brackets             ON clan_brackets(season_week);
CREATE INDEX IF NOT EXISTS idx_clan_bracket_entries      ON clan_bracket_entries(bracket_id);
CREATE INDEX IF NOT EXISTS idx_clan_bracket_matches      ON clan_bracket_matches(bracket_id, round);
CREATE INDEX IF NOT EXISTS idx_upgrade_mastery           ON upgrade_mastery(telegram_id);
CREATE INDEX IF NOT EXISTS idx_tap_challenge_runs        ON tap_challenge_runs(telegram_id, status);
CREATE INDEX IF NOT EXISTS idx_tap_challenge_records     ON tap_challenge_records(challenge_key, best_taps DESC);

-- ── Layer 13: Guild Skill Tree ────────────────────────────────────────────────
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS skill_xp    BIGINT  NOT NULL DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS skill_level INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS guild_skill_tree (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guild_id    INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  skill_key   TEXT    NOT NULL,
  level       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (guild_id, skill_key)
);
CREATE INDEX IF NOT EXISTS idx_guild_skill_tree ON guild_skill_tree(guild_id);

-- ── Layer 15: Live World Events ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_world_events (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_key  TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  icon       TEXT    NOT NULL DEFAULT '✨',
  effect     TEXT    NOT NULL,
  value      NUMERIC NOT NULL DEFAULT 1,
  starts_at  BIGINT  NOT NULL,
  ends_at    BIGINT  NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_live_world_events_active ON live_world_events(active, ends_at);

-- ── Layer 16: Build Presets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS build_presets (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  slot        INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 3),
  name        TEXT    NOT NULL DEFAULT 'Preset',
  data        JSONB   NOT NULL DEFAULT '{}',
  saved_at    BIGINT  NOT NULL,
  UNIQUE (telegram_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_build_presets ON build_presets(telegram_id);

-- ── Layer 17: Boss Ecosystem ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boss_ecosystem (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  boss_key     TEXT    NOT NULL UNIQUE,
  hp           BIGINT  NOT NULL,
  max_hp       BIGINT  NOT NULL,
  last_killed_at BIGINT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS boss_ecosystem_hits (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  boss_key    TEXT    NOT NULL,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  damage      BIGINT  NOT NULL DEFAULT 0,
  rewarded    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (boss_key, telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_boss_ecosystem       ON boss_ecosystem(active);
CREATE INDEX IF NOT EXISTS idx_boss_ecosystem_hits  ON boss_ecosystem_hits(boss_key, damage DESC);

-- ── Layer 18: Ghost Race Records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ghost_records (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id   TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  challenge_key TEXT    NOT NULL,
  total_taps    INTEGER NOT NULL DEFAULT 0,
  tap_timeline  JSONB   NOT NULL DEFAULT '[]',
  recorded_at   BIGINT  NOT NULL,
  UNIQUE (telegram_id, challenge_key)
);
CREATE INDEX IF NOT EXISTS idx_ghost_records ON ghost_records(challenge_key, total_taps DESC);

-- ── Layer 19: Quest Board ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quest_progress (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  quest_key   TEXT    NOT NULL,
  period_key  TEXT    NOT NULL,
  progress    INTEGER NOT NULL DEFAULT 0,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  claimed     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (telegram_id, quest_key, period_key)
);
CREATE TABLE IF NOT EXISTS quest_chests (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  period_key  TEXT    NOT NULL,
  opened      BOOLEAN NOT NULL DEFAULT FALSE,
  opened_at   BIGINT,
  UNIQUE (telegram_id, period_key)
);
CREATE INDEX IF NOT EXISTS idx_quest_progress ON quest_progress(telegram_id, period_key);

-- ── Layer 20: Cooperative Raid ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coop_raid_lobbies (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  boss_key    TEXT    NOT NULL,
  creator_id  TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  hp          BIGINT  NOT NULL,
  max_hp      BIGINT  NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'waiting',
  starts_at   BIGINT,
  ends_at     BIGINT,
  created_at  BIGINT  NOT NULL
);
CREATE TABLE IF NOT EXISTS coop_raid_members (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lobby_id    INTEGER NOT NULL REFERENCES coop_raid_lobbies(id) ON DELETE CASCADE,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  damage      BIGINT  NOT NULL DEFAULT 0,
  rewarded    BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   BIGINT  NOT NULL,
  UNIQUE (lobby_id, telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_coop_raid_lobbies ON coop_raid_lobbies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coop_raid_members ON coop_raid_members(lobby_id, damage DESC);

-- ── Layer 21: Prestige Relics ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_relics (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  relic_key   TEXT    NOT NULL,
  equipped    BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at BIGINT  NOT NULL,
  UNIQUE (telegram_id, relic_key)
);
CREATE INDEX IF NOT EXISTS idx_player_relics ON player_relics(telegram_id);

-- ── Layer 22: Division Leagues ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS division_members (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  week_key    TEXT    NOT NULL,
  division_id INTEGER NOT NULL DEFAULT 0,
  tier        TEXT    NOT NULL DEFAULT 'Iron',
  tap_score   BIGINT  NOT NULL DEFAULT 0,
  rank        INTEGER NOT NULL DEFAULT 0,
  settled     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (telegram_id, week_key)
);
CREATE INDEX IF NOT EXISTS idx_division_members ON division_members(week_key, division_id, tap_score DESC);

-- ── Layer 24: Achievement Gallery ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_achievements (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  ach_key     TEXT    NOT NULL,
  claimed_at  BIGINT  NOT NULL,
  UNIQUE (telegram_id, ach_key)
);
CREATE INDEX IF NOT EXISTS idx_gallery_achievements ON gallery_achievements(telegram_id);

-- ── Layer 25: Rhythm Tap ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rhythm_tap_scores (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  score       INTEGER NOT NULL DEFAULT 0,
  accuracy    NUMERIC(5,2) NOT NULL DEFAULT 0,
  perfect     INTEGER NOT NULL DEFAULT 0,
  good        INTEGER NOT NULL DEFAULT 0,
  miss        INTEGER NOT NULL DEFAULT 0,
  played_at   BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rhythm_tap ON rhythm_tap_scores(telegram_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_rhythm_lb  ON rhythm_tap_scores(score DESC);

-- ── Layer 26: AI Shadow Rival ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shadow_rivals (
  telegram_id      TEXT    PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  rival_level      INTEGER NOT NULL DEFAULT 1,
  rival_score      BIGINT  NOT NULL DEFAULT 0,
  wins             INTEGER NOT NULL DEFAULT 0,
  losses           INTEGER NOT NULL DEFAULT 0,
  shards           INTEGER NOT NULL DEFAULT 0,
  last_challenge   BIGINT  NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS rival_shard_upgrades (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  upgrade_key TEXT    NOT NULL,
  purchased_at BIGINT NOT NULL,
  UNIQUE (telegram_id, upgrade_key)
);

-- ── Layer 27: Guild Territories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS territory_control (
  territory_id INTEGER NOT NULL,
  week_key     TEXT    NOT NULL,
  guild_id     INTEGER REFERENCES guilds(id) ON DELETE SET NULL,
  tap_counts   JSONB   NOT NULL DEFAULT '{}',
  captured_at  BIGINT,
  PRIMARY KEY (territory_id, week_key)
);
CREATE INDEX IF NOT EXISTS idx_territory_week ON territory_control(week_key);

-- ── Layer 28: Tap Alchemy ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alchemy_ingredients (
  telegram_id     TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  tap_shard       INTEGER NOT NULL DEFAULT 0,
  energy_crystal  INTEGER NOT NULL DEFAULT 0,
  combo_dust      INTEGER NOT NULL DEFAULT 0,
  prestige_essence INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id)
);
CREATE TABLE IF NOT EXISTS alchemy_brews (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  recipe_key  TEXT    NOT NULL,
  brewed_at   BIGINT  NOT NULL,
  expires_at  BIGINT,
  used        BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_alchemy_brews ON alchemy_brews(telegram_id, used, expires_at);

-- ── Layer 29: Story Campaign ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_progress (
  telegram_id    TEXT    PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  chapter        INTEGER NOT NULL DEFAULT 1,
  boss_hp        BIGINT  NOT NULL DEFAULT 0,
  boss_max_hp    BIGINT  NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT FALSE,
  started_at     BIGINT,
  completed_chapters JSONB NOT NULL DEFAULT '[]'
);

-- ── Layer 30: Global Community Boss ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_boss_events (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  boss_key    TEXT    NOT NULL,
  max_hp      BIGINT  NOT NULL,
  current_hp  BIGINT  NOT NULL,
  started_at  BIGINT  NOT NULL,
  ends_at     BIGINT  NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'active',
  milestones_hit JSONB NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS global_boss_hits (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES global_boss_events(id) ON DELETE CASCADE,
  telegram_id TEXT    NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  damage      BIGINT  NOT NULL DEFAULT 0,
  rewarded    BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_global_boss_hits ON global_boss_hits(event_id, damage DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_boss_hits_unique ON global_boss_hits(event_id, telegram_id);
