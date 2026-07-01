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

  // ─── Tapper core ────────────────────────────────────────────────────────────

  TAPPER_MAX_TAPS_PER_SEC: 20,
  TAPPER_MAX_OFFLINE_HOURS: 8,
  TAPPER_PRESTIGE_THRESHOLD: 1_000_000,
  TAPPER_CRIT_CHANCE: 0.03,

  TAPPER_UPGRADES: {
    TAP_POWER:  { maxLevel: 5, costs: [0, 100, 300, 700, 1500, 3500],       label: 'Tap Power',       icon: '⚡', description: 'Points per tap',        unit: 'pts/tap', getEffect: (l) => l + 1 },
    ENERGY_MAX: { maxLevel: 5, costs: [0, 200, 500, 1200, 2500, 5000],      label: 'Energy Capacity', icon: '🔋', description: 'Max energy storage',    unit: 'energy',  getEffect: (l) => 1000 + l * 1000 },
    REGEN_RATE: { maxLevel: 5, costs: [0, 150, 400, 900, 2000, 4500],       label: 'Energy Regen',    icon: '♻️', description: 'Energy per second',      unit: '/sec',    getEffect: (l) => 2 + l * 2 },
    MULTI_TAP:  { maxLevel: 3, costs: [0, 500, 2000, 6000, 0],              label: 'Multi-Tap',       icon: '✌️', description: 'Energy used per click',  unit: '×/click', getEffect: (l) => l + 1 },
    AUTO_BRAIN: { maxLevel: 5, costs: [0, 1000, 3000, 8000, 20000, 50000], label: 'Auto Brain',      icon: '🤖', description: 'Passive pts per minute', unit: 'pts/min', getEffect: (l) => l * 2 },
  },

  TAPPER_ACHIEVEMENTS: [
    { key: 'tap_first',    name: 'First Tap',      emoji: '👆', reward: 10,   check: (p) => p.total_taps >= 1 },
    { key: 'tap_100',      name: '100 Taps',        emoji: '💯', reward: 25,   check: (p) => p.total_taps >= 100 },
    { key: 'tap_1k',       name: '1K Tapper',       emoji: '🔥', reward: 75,   check: (p) => p.total_taps >= 1000 },
    { key: 'tap_10k',      name: '10K Legend',      emoji: '⚡', reward: 200,  check: (p) => p.total_taps >= 10000 },
    { key: 'tap_100k',     name: '100K God',        emoji: '🧠', reward: 500,  check: (p) => p.total_taps >= 100000 },
    { key: 'tap_maxed',    name: 'Fully Upgraded',  emoji: '💎', reward: 300,  check: (p) => p.tap_power_level >= 5 && p.energy_max_level >= 5 && p.regen_rate_level >= 5 },
    { key: 'tap_prestige', name: 'Prestige',        emoji: '✨', reward: 1000, check: (p) => p.prestige >= 1 },
  ],

  BOSS_NAMES: ['Mega Brain', 'Crypto Kraken', 'FOMO Phantom', 'Whale Boss', 'Moon Titan', 'Degen Dragon'],

  // ─── Tapper ranks ────────────────────────────────────────────────────────────

  TAPPER_RANKS: [
    { name: 'Bronze',  emoji: '🥉', minTaps: 0,         color: '#cd7f32' },
    { name: 'Silver',  emoji: '🥈', minTaps: 1_000,     color: '#c0c5ce' },
    { name: 'Gold',    emoji: '🥇', minTaps: 10_000,    color: '#f5c344' },
    { name: 'Diamond', emoji: '💎', minTaps: 100_000,   color: '#00e5ff' },
    { name: 'Legend',  emoji: '🧠', minTaps: 500_000,   color: '#ff4fa3' },
  ],

  rankForTaps(totalTaps) {
    let rank = module.exports.TAPPER_RANKS[0];
    for (const r of module.exports.TAPPER_RANKS) {
      if (totalTaps >= r.minTaps) rank = r;
    }
    return rank;
  },

  // ─── Passive income cards ────────────────────────────────────────────────────

  PASSIVE_CARDS: [
    // Tech
    { key: 'neural_net',   name: 'Neural Net',      category: 'tech',    icon: '🧬', description: 'Self-learning AI generates passive BP',       baseIncome: 10, incomeStep: 8,  costs: [0,200,500,1000,2000,4000,8000,15000,30000,60000,120000] },
    { key: 'quantum_cpu',  name: 'Quantum CPU',      category: 'tech',    icon: '⚛️', description: 'Quantum processing boosts output',             baseIncome: 15, incomeStep: 12, costs: [0,300,750,1500,3000,6000,12000,24000,48000,96000,200000] },
    { key: 'memory_chip',  name: 'Memory Chip',      category: 'tech',    icon: '💾', description: 'Cached computations, faster earnings',         baseIncome: 8,  incomeStep: 6,  costs: [0,150,400,800,1600,3200,6400,12000,24000,50000,100000] },
    { key: 'algo_boost',   name: 'Algo Boost',       category: 'tech',    icon: '🔄', description: 'Optimized algorithms increase efficiency',     baseIncome: 20, incomeStep: 15, costs: [0,500,1200,2500,5000,10000,20000,40000,80000,150000,300000] },
    { key: 'gpu_farm',     name: 'GPU Farm',          category: 'tech',    icon: '🖥️', description: 'Massive parallel processing power',            baseIncome: 30, incomeStep: 25, costs: [0,1000,2500,5000,10000,20000,40000,80000,160000,300000,600000] },
    // Finance
    { key: 'defi_protocol',name: 'DeFi Protocol',    category: 'finance', icon: '🏦', description: 'Decentralized yield generation',               baseIncome: 12, incomeStep: 10, costs: [0,250,600,1200,2400,5000,10000,20000,40000,80000,160000] },
    { key: 'yield_farm',   name: 'Yield Farm',        category: 'finance', icon: '🌾', description: 'Compound interest on brain points',            baseIncome: 18, incomeStep: 14, costs: [0,400,1000,2000,4000,8000,16000,32000,64000,130000,260000] },
    { key: 'staking_pool', name: 'Staking Pool',      category: 'finance', icon: '🔒', description: 'Locked assets generate passive income',        baseIncome: 25, incomeStep: 20, costs: [0,700,1800,3500,7000,14000,28000,56000,110000,220000,440000] },
    { key: 'token_launch', name: 'Token Launch',      category: 'finance', icon: '🚀', description: 'IDO profits flow to your wallet',             baseIncome: 40, incomeStep: 35, costs: [0,1500,3500,7000,14000,28000,56000,110000,220000,440000,880000] },
    { key: 'vc_fund',      name: 'VC Fund',           category: 'finance', icon: '💼', description: 'Venture returns on brain investments',         baseIncome: 60, incomeStep: 50, costs: [0,3000,7000,14000,28000,56000,110000,220000,440000,880000,1800000] },
    // Social
    { key: 'influencer',   name: 'Influencer',        category: 'social',  icon: '⭐', description: 'Viral posts attract brain points',             baseIncome: 6,  incomeStep: 5,  costs: [0,100,250,500,1000,2000,4000,8000,16000,32000,64000] },
    { key: 'community_hub',name: 'Community Hub',     category: 'social',  icon: '🏛️', description: 'Community engagement boosts income',          baseIncome: 14, incomeStep: 11, costs: [0,300,700,1400,2800,5600,11000,22000,44000,88000,180000] },
    { key: 'content_studio',name:'Content Studio',    category: 'social',  icon: '🎬', description: 'Viral content monetization',                  baseIncome: 22, incomeStep: 18, costs: [0,600,1500,3000,6000,12000,24000,48000,96000,190000,380000] },
    { key: 'viral_engine', name: 'Viral Engine',      category: 'social',  icon: '📢', description: 'Exponential reach multiplier',                baseIncome: 35, incomeStep: 30, costs: [0,1200,3000,6000,12000,24000,48000,96000,190000,380000,760000] },
    { key: 'dao_vote',     name: 'DAO Governance',    category: 'social',  icon: '🗳️', description: 'Governance participation rewards',             baseIncome: 50, incomeStep: 45, costs: [0,2500,6000,12000,24000,48000,96000,190000,380000,760000,1500000] },
  ],

  // ─── Lucky wheel ─────────────────────────────────────────────────────────────

  WHEEL_PRIZES: [
    { type: 'coins',  value: 50,   label: '50 BP',      weight: 28, color: '#f5c344' },
    { type: 'coins',  value: 100,  label: '100 BP',     weight: 22, color: '#f5c344' },
    { type: 'coins',  value: 250,  label: '250 BP',     weight: 16, color: '#f5c344' },
    { type: 'coins',  value: 500,  label: '500 BP',     weight: 12, color: '#ff8c00' },
    { type: 'energy', value: 1,    label: 'Full Energy', weight: 10, color: '#00e5ff' },
    { type: 'coins',  value: 1000, label: '1K BP',      weight: 7,  color: '#ff4fa3' },
    { type: 'coins',  value: 2500, label: '2.5K BP',    weight: 4,  color: '#8b5cf6' },
    { type: 'gems',   value: 5,    label: '5 Gems',     weight: 1,  color: '#00ffaa' },
  ],

  pickWheelPrize() {
    const prizes = module.exports.WHEEL_PRIZES;
    const total = prizes.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < prizes.length; i++) {
      rand -= prizes[i].weight;
      if (rand <= 0) return { ...prizes[i], index: i };
    }
    return { ...prizes[0], index: 0 };
  },

  // ─── Daily missions ──────────────────────────────────────────────────────────

  DAILY_MISSIONS: [
    { key: 'tap_100',    name: 'Tap Addict',   emoji: '👆', target: 100,  reward: 50,  type: 'taps' },
    { key: 'tap_500',    name: 'Tap Machine',  emoji: '⚡', target: 500,  reward: 150, type: 'taps' },
    { key: 'tap_2000',   name: 'Tap God',      emoji: '🔥', target: 2000, reward: 400, type: 'taps' },
    { key: 'earn_500',   name: 'BP Earner',    emoji: '💰', target: 500,  reward: 100, type: 'bp' },
    { key: 'boss_hit',   name: 'Boss Slayer',  emoji: '⚔️', target: 1,    reward: 100, type: 'boss' },
    { key: 'buy_upgrade',name: 'Investor',     emoji: '📈', target: 1,    reward: 75,  type: 'upgrade' },
  ],
};
