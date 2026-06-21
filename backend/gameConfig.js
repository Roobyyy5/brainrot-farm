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

  LEVELS: [
    { name: 'NPC', minCoins: 0 },
    { name: 'Sigma', minCoins: 1000 },
    { name: 'Gigachad', minCoins: 10000 },
  ],

  levelForCoins(coins) {
    let current = 'NPC';
    for (const lvl of module.exports.LEVELS) {
      if (coins >= lvl.minCoins) current = lvl.name;
    }
    return current;
  },
};
