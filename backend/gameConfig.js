module.exports = {
  FARM_COOLDOWN_MS: 5 * 60 * 1000,
  FARM_MIN_REWARD: 10,
  FARM_MAX_REWARD: 30,

  DAILY_COOLDOWN_MS: 24 * 60 * 60 * 1000,
  DAILY_STREAK_RESET_MS: 48 * 60 * 60 * 1000,
  DAILY_BASE_REWARD: 50,
  DAILY_STREAK_STEP: 10,
  DAILY_STREAK_MAX_BONUS: 200,

  REFERRAL_SIGNUP_BONUS: 100,
  REFERRAL_ACTIVE_BONUS: 200,

  BOOST_COST: 25,

  SEASON_DURATION_MS: 7 * 24 * 60 * 60 * 1000,

  // Checked against live user state (coins, farm_count, daily_streak, ...)
  // each time a relevant action happens. `check` must be cheap and pure.
  ACHIEVEMENTS: [
    { key: 'first_farm', name: 'First Farm', emoji: '🌱', reward: 20, check: (u) => u.farm_count >= 1 },
    { key: 'dedicated_farmer', name: 'Dedicated Farmer', emoji: '🚜', reward: 50, check: (u) => u.farm_count >= 10 },
    { key: 'farm_veteran', name: 'Farm Veteran', emoji: '🏆', reward: 200, check: (u) => u.farm_count >= 100 },
    { key: 'week_streak', name: 'Week Streak', emoji: '🔥', reward: 150, check: (u) => u.daily_streak >= 7 },
    { key: 'networker', name: 'Networker', emoji: '🤝', reward: 50, check: (u, ctx) => ctx.totalReferrals >= 1 },
    { key: 'recruiter', name: 'Recruiter', emoji: '📢', reward: 300, check: (u, ctx) => ctx.activeReferrals >= 5 },
  ],

  LEVELS: [
    { name: 'NPC', minCoins: 0 },
    { name: 'Sigma', minCoins: 1000 },
    { name: 'Gigachad', minCoins: 10000 },
    { name: 'Ohio Rizzler', minCoins: 50000 },
    { name: 'Skibidi Legend', minCoins: 200000 },
  ],

  levelForCoins(coins) {
    let current = 'NPC';
    for (const lvl of module.exports.LEVELS) {
      if (coins >= lvl.minCoins) current = lvl.name;
    }
    return current;
  },

  TAPPER_MAX_TAPS_PER_SEC: 20,
  TAPPER_MAX_OFFLINE_HOURS: 8,
  TAPPER_PRESTIGE_THRESHOLD: 1_000_000,
  TAPPER_CRIT_CHANCE: 0.03,

  TAPPER_UPGRADES: {
    TAP_POWER:  { maxLevel: 5, costs: [0, 100, 300, 700, 1500, 3500],         label: 'Tap Power',       icon: '⚡', description: 'Points per tap',        unit: 'pts/tap', getEffect: (l) => l + 1 },
    ENERGY_MAX: { maxLevel: 5, costs: [0, 200, 500, 1200, 2500, 5000],        label: 'Energy Capacity', icon: '🔋', description: 'Max energy storage',    unit: 'energy',  getEffect: (l) => 1000 + l * 1000 },
    REGEN_RATE: { maxLevel: 5, costs: [0, 150, 400, 900, 2000, 4500],         label: 'Energy Regen',    icon: '♻️', description: 'Energy per second',      unit: '/sec',    getEffect: (l) => 2 + l * 2 },
    MULTI_TAP:  { maxLevel: 3, costs: [0, 500, 2000, 6000, 0],               label: 'Multi-Tap',       icon: '✌️', description: 'Energy used per click',  unit: '×/click', getEffect: (l) => l + 1 },
    AUTO_BRAIN: { maxLevel: 5, costs: [0, 1000, 3000, 8000, 20000, 50000],   label: 'Auto Brain',      icon: '🤖', description: 'Passive pts per minute', unit: 'pts/min', getEffect: (l) => l * 2 },
  },

  TAPPER_ACHIEVEMENTS: [
    { key: 'tap_first',   name: 'First Tap',      emoji: '👆', reward: 10,   check: (p) => p.total_taps >= 1 },
    { key: 'tap_100',     name: '100 Taps',        emoji: '💯', reward: 25,   check: (p) => p.total_taps >= 100 },
    { key: 'tap_1k',      name: '1K Tapper',       emoji: '🔥', reward: 75,   check: (p) => p.total_taps >= 1000 },
    { key: 'tap_10k',     name: '10K Legend',      emoji: '⚡', reward: 200,  check: (p) => p.total_taps >= 10000 },
    { key: 'tap_100k',    name: '100K God',        emoji: '🧠', reward: 500,  check: (p) => p.total_taps >= 100000 },
    { key: 'tap_maxed',   name: 'Fully Upgraded',  emoji: '💎', reward: 300,  check: (p) => p.tap_power_level >= 5 && p.energy_max_level >= 5 && p.regen_rate_level >= 5 },
    { key: 'tap_prestige','name': 'Prestige',      emoji: '✨', reward: 1000, check: (p) => p.prestige >= 1 },
  ],

  BOSS_NAMES: ['Mega Brain', 'Crypto Kraken', 'FOMO Phantom', 'Whale Boss', 'Moon Titan', 'Degen Dragon'],
};
