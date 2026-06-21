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
};
