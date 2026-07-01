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

  // ─── Tap streak ──────────────────────────────────────────────────────────────

  TAP_STREAK_BONUS_PCT: 5,  // % per consecutive day
  TAP_STREAK_MAX_DAYS: 10,  // cap at 50% bonus

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

  // ─── Brain skins ─────────────────────────────────────────────────────────────

  BRAIN_SKINS: {
    default:      { emoji: '🧠',   name: 'Classic',       unlock: 'default' },
    prestige1:    { emoji: '⭐🧠', name: 'Star Brain',    unlock: 'prestige', minPrestige: 1, auto: true },
    prestige2:    { emoji: '💫🧠', name: 'Galaxy Brain',  unlock: 'prestige', minPrestige: 2, auto: true },
    prestige3:    { emoji: '🌟🧠', name: 'Cosmic Brain',  unlock: 'prestige', minPrestige: 3, auto: true },
    skin_fire:    { emoji: '🔥🧠', name: 'Fire Brain',    unlock: 'gem_shop' },
    skin_diamond: { emoji: '💎🧠', name: 'Diamond Brain', unlock: 'gem_shop' },
    skin_crown:   { emoji: '👑🧠', name: 'Crown Brain',   unlock: 'gem_shop' },
  },

  // ─── Gem shop ────────────────────────────────────────────────────────────────

  GEMSHOP_ITEMS: [
    { key: 'energy_refill', name: 'Energy Refill',     icon: '⚡', description: 'Instantly fill energy to max',          cost: 10,  type: 'instant' },
    { key: '2x_tap',        name: '2× Tap Boost',      icon: '🔥', description: '2× tap power for 5 minutes',           cost: 15,  type: 'boost',  durationMs: 5 * 60 * 1000 },
    { key: 'auto_income',   name: '8h Passive Claim',  icon: '🤖', description: 'Instantly collect 8h passive income',  cost: 20,  type: 'instant' },
    { key: 'loot_box',      name: 'Mystery Brain',     icon: '🎁', description: 'Random prize: gems, boost or rare skin', cost: 30, type: 'loot_box' },
    { key: 'auto_tapper',   name: 'Auto-Tapper 1h',   icon: '🦾', description: 'Auto-taps 3/sec for 1 hour',           cost: 40,  type: 'auto_tapper', durationMs: 60 * 60 * 1000 },
    { key: 'skin_fire',     name: 'Fire Brain 🔥',     icon: '🔥', description: '🔥🧠 blazing brain skin',              cost: 50,  type: 'skin' },
    { key: 'skin_diamond',  name: 'Diamond Brain 💎',  icon: '💎', description: '💎🧠 crystalline prestige skin',        cost: 75,  type: 'skin' },
    { key: 'skin_crown',    name: 'Crown Brain 👑',    icon: '👑', description: '👑🧠 royal skin for true legends',      cost: 100, type: 'skin' },
  ],

  // ─── Weekly league ───────────────────────────────────────────────────────────

  WEEKLY_LEAGUE_GEMS: [100, 75, 50, 30, 25, 25, 20, 20, 15, 15],

  // ─── Skill tree ──────────────────────────────────────────────────────────────

  SKILL_TREE: {
    power: {
      label: 'Power', icon: '⚡',
      skills: [
        { key: 'tap_force',   name: 'Tap Force',    maxLevel: 5, costs: [200,500,1000,2000,5000],    desc: '+1 tap power per level' },
        { key: 'crit_chance', name: 'Critical Eye', maxLevel: 5, costs: [300,700,1500,3000,7000],    desc: '+3% crit chance per level' },
        { key: 'crit_multi',  name: 'Crit Amp',     maxLevel: 3, costs: [1000,3000,8000],             desc: 'Crit multiplier +5× per level' },
        { key: 'tap_fury',    name: 'Tap Fury',     maxLevel: 3, costs: [2000,6000,15000],            desc: '+10% tap batch speed per level' },
      ],
    },
    energy: {
      label: 'Energy', icon: '🔋',
      skills: [
        { key: 'energy_cap',  name: 'Brain Vessel', maxLevel: 5, costs: [400,900,1800,4000,9000],    desc: '+500 max energy per level' },
        { key: 'regen_boost', name: 'Fast Regen',   maxLevel: 5, costs: [350,800,1600,3500,8000],    desc: '+1 regen/sec per level' },
        { key: 'efficiency',  name: 'Efficiency',   maxLevel: 3, costs: [1500,4000,10000],            desc: '-10% energy cost per level' },
        { key: 'overflow',    name: 'Overflow',     maxLevel: 1, costs: [20000],                      desc: 'Taps beyond max at 50% power' },
      ],
    },
    passive: {
      label: 'Passive', icon: '💰',
      skills: [
        { key: 'card_boost',   name: 'Card Master',  maxLevel: 5, costs: [500,1200,2500,5000,12000],  desc: '+15% card income per level' },
        { key: 'offline_amp',  name: 'Brain AFK',    maxLevel: 5, costs: [400,1000,2000,4500,10000],  desc: '+25% offline income per level' },
        { key: 'skill_regen',  name: 'Grind Master', maxLevel: 3, costs: [800,2000,5000],              desc: '+1 skill pt per 25 taps per level' },
        { key: 'referral_amp', name: 'Network King', maxLevel: 3, costs: [600,1800,5000],              desc: '+2% per referral bonus per level' },
      ],
    },
    luck: {
      label: 'Luck', icon: '🍀',
      skills: [
        { key: 'gem_drops',   name: 'Gem Finder',   maxLevel: 5, costs: [600,1500,3000,7000,15000],   desc: '+1.5% gem drop chance per level' },
        { key: 'boss_loot',   name: 'Boss Looter',  maxLevel: 3, costs: [900,2500,7000],               desc: '+25% boss reward per level' },
        { key: 'wheel_luck',  name: 'Lucky Spin',   maxLevel: 3, costs: [700,2000,6000],               desc: 'Wheel prizes ×1.1 per level' },
        { key: 'loot_master', name: 'Loot Master',  maxLevel: 3, costs: [1200,3500,9000],              desc: '+1 loot reroll per level' },
      ],
    },
  },

  SKILL_POINTS_PER_TAPS: 50,

  // ─── Talents (chosen on prestige) ────────────────────────────────────────────

  TALENTS: [
    { key: 'double_glory',   name: 'Double Glory',   desc: 'Prestige gives +2 tap power instead of +1', icon: '⚡' },
    { key: 'energy_god',     name: 'Energy God',      desc: 'Max energy permanently +1000',              icon: '🔋' },
    { key: 'passive_lord',   name: 'Passive Lord',    desc: 'Card income ×1.5 permanently',              icon: '💰' },
    { key: 'crit_storm',     name: 'Crit Storm',      desc: '+10% crit chance permanently',              icon: '🌪️' },
    { key: 'gem_magnet',     name: 'Gem Magnet',      desc: '+5% gem drop chance permanently',           icon: '💎' },
    { key: 'boss_slayer',    name: 'Boss Slayer',     desc: 'Double damage to bosses',                   icon: '⚔️' },
    { key: 'eternal_streak', name: 'Eternal Streak',  desc: 'Tap streak never resets on missed day',     icon: '🔥' },
    { key: 'auto_master',    name: 'Auto Master',     desc: 'Auto-income rate ×2',                       icon: '🤖' },
  ],

  // ─── Battle Pass ─────────────────────────────────────────────────────────────

  BATTLE_PASS_XP_PER_ENERGY: 1,
  BATTLE_PASS_LEVEL_XP: 500,
  BATTLE_PASS_LEVELS: 30,
  BATTLE_PASS_PREMIUM_COST: 200,

  BATTLE_PASS_FREE: {
    3:  { type: 'coins',        amount: 1000 },
    5:  { type: 'gems',         amount: 5 },
    8:  { type: 'skill_points', amount: 30 },
    10: { type: 'gems',         amount: 10 },
    12: { type: 'energy_refill' },
    15: { type: 'gems',         amount: 20 },
    18: { type: 'skill_points', amount: 50 },
    20: { type: 'gems',         amount: 30 },
    25: { type: '2x_boost',     durationMs: 10 * 60 * 1000 },
    30: { type: 'gems',         amount: 100 },
  },

  BATTLE_PASS_PREMIUM: {
    1:  { type: 'gems',         amount: 10 },
    5:  { type: 'skin',         skin: 'skin_fire' },
    8:  { type: 'gems',         amount: 20 },
    10: { type: '2x_boost',     durationMs: 30 * 60 * 1000 },
    12: { type: 'gems',         amount: 30 },
    15: { type: 'skin',         skin: 'skin_diamond' },
    18: { type: 'gems',         amount: 50 },
    20: { type: '2x_boost',     durationMs: 60 * 60 * 1000 },
    25: { type: 'skin',         skin: 'skin_crown' },
    30: { type: 'gems',         amount: 200 },
  },

  // ─── Login Streak ─────────────────────────────────────────────────────────────

  LOGIN_STREAK_REWARDS: [
    { type: 'coins', amount: 500 },
    { type: 'coins', amount: 1000 },
    { type: 'gems',  amount: 5 },
    { type: 'coins', amount: 2000 },
    { type: 'gems',  amount: 10 },
    { type: 'energy_refill' },
    { type: 'gems',  amount: 25 },
  ],

  // ─── Guild system ─────────────────────────────────────────────────────────────

  GUILD_MAX_MEMBERS: 10,
  GUILD_BOSS_SCHEDULE: [
    { name: 'Neuron Titan',  maxHp: 500_000,    rewardGems: 20 },
    { name: 'Synapse Beast', maxHp: 1_000_000,  rewardGems: 35 },
    { name: 'Cortex Dragon', maxHp: 2_000_000,  rewardGems: 60 },
    { name: 'Axon Colossus', maxHp: 5_000_000,  rewardGems: 100 },
  ],

  // ─── Loot Box ────────────────────────────────────────────────────────────────

  LOOT_BOX_PRIZES: [
    { weight: 30, type: 'gems',         amount: 10,                                    label: '💎 10 Gems' },
    { weight: 22, type: 'gems',         amount: 25,                                    label: '💎 25 Gems' },
    { weight: 13, type: 'gems',         amount: 50,                                    label: '💎 50 Gems' },
    { weight: 11, type: 'boost',        boost: '2x_tap', durationMs: 10 * 60 * 1000,  label: '🔥 2× Tap 10m' },
    { weight: 8,  type: 'skill_points', amount: 100,                                   label: '🧪 100 Skill Pts' },
    { weight: 7,  type: 'pet',          pet: 'brain_cat',                              label: '🐱 Brain Cat Pet' },
    { weight: 4,  type: 'pet',          pet: 'energy_fox',                             label: '🦊 Energy Fox Pet' },
    { weight: 3,  type: 'skin',         skin: 'skin_fire',                             label: '🔥🧠 Fire Brain' },
    { weight: 1,  type: 'pet',          pet: 'gem_dragon',                             label: '🐉 Gem Dragon Pet' },
    { weight: 1,  type: 'skin',         skin: 'skin_diamond',                          label: '💎🧠 Diamond Brain' },
  ],

  pickLootBoxPrize() {
    const prizes = module.exports.LOOT_BOX_PRIZES;
    const total = prizes.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * total;
    for (const p of prizes) { rand -= p.weight; if (rand <= 0) return p; }
    return prizes[0];
  },

  // ─── Daily Shop ──────────────────────────────────────────────────────────────

  DAILY_SHOP_POOL: [
    { key: 'ds_boost_15m',   name: '2× Boost 15min',   icon: '🔥', cost: 12, type: 'boost',        durationMs: 15 * 60 * 1000 },
    { key: 'ds_boost_30m',   name: '2× Boost 30min',   icon: '🔥', cost: 20, type: 'boost',        durationMs: 30 * 60 * 1000 },
    { key: 'ds_boost_1h',    name: '2× Boost 1h',      icon: '🔥', cost: 35, type: 'boost',        durationMs: 60 * 60 * 1000 },
    { key: 'ds_energy_x2',   name: '2× Energy Refill', icon: '⚡', cost: 15, type: 'energy_x2' },
    { key: 'ds_lootbox',     name: 'Mystery Brain',    icon: '🎁', cost: 25, type: 'loot_box' },
    { key: 'ds_skill_50',    name: '50 Skill Points',  icon: '🧪', cost: 18, type: 'skill_points',  amount: 50 },
    { key: 'ds_skill_100',   name: '100 Skill Points', icon: '🧪', cost: 30, type: 'skill_points',  amount: 100 },
    { key: 'ds_auto_2h',     name: 'Auto-Tapper 2h',  icon: '🤖', cost: 22, type: 'auto_tapper',  durationMs: 2 * 60 * 60 * 1000 },
  ],

  getDailyShopItems() {
    const pool = module.exports.DAILY_SHOP_POOL;
    const dayKey = new Date().toISOString().slice(0, 10);
    let seed = dayKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const shuffled = [...pool].sort(() => {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280) - 0.5;
    });
    return shuffled.slice(0, 3);
  },

  // ─── Pets ────────────────────────────────────────────────────────────────────

  PETS: [
    { key: 'brain_cat',        name: 'Brain Cat',        icon: '🐱', rarity: 'common',    desc: '+5% tap power',        bonus: { tapPowerPct: 0.05 } },
    { key: 'energy_fox',       name: 'Energy Fox',       icon: '🦊', rarity: 'uncommon',  desc: '+200 max energy',      bonus: { extraEnergy: 200 } },
    { key: 'gem_dragon',       name: 'Gem Dragon',       icon: '🐉', rarity: 'rare',      desc: '+2% gem drop chance',  bonus: { gemDropPct: 0.02 } },
    { key: 'crit_wolf',        name: 'Crit Wolf',        icon: '🐺', rarity: 'rare',      desc: '+5% crit chance',      bonus: { critChancePct: 0.05 } },
    { key: 'lucky_rabbit',     name: 'Lucky Rabbit',     icon: '🐰', rarity: 'uncommon',  desc: 'Wheel prizes ×1.2',    bonus: { wheelMult: 1.2 } },
    { key: 'prestige_phoenix', name: 'Prestige Phoenix', icon: '🔥', rarity: 'legendary', desc: '+20% offline income',  bonus: { offlinePct: 20 } },
  ],

  PET_RARITY_COLOR: { common: '#9ca3af', uncommon: '#34d399', rare: '#60a5fa', legendary: '#f59e0b' },

  getPetBonuses(petKey) {
    if (!petKey) return {};
    const pet = module.exports.PETS.find(p => p.key === petKey);
    return pet ? pet.bonus : {};
  },

  // ─── World Zones ─────────────────────────────────────────────────────────────

  WORLD_ZONES: [
    { zone: 1, name: 'Neuron Valley',     icon: '🌿', unlockTaps: 0,          tapPowerBonus: 0, desc: 'Starting zone' },
    { zone: 2, name: 'Synapse City',      icon: '🏙️',  unlockTaps: 50_000,    tapPowerBonus: 1, desc: 'Unlock at 50K taps' },
    { zone: 3, name: 'Cortex Canyon',     icon: '🏔️',  unlockTaps: 250_000,   tapPowerBonus: 2, desc: 'Unlock at 250K taps' },
    { zone: 4, name: 'Axon Abyss',        icon: '🌋', unlockTaps: 1_000_000,  tapPowerBonus: 3, desc: 'Unlock at 1M taps' },
    { zone: 5, name: 'Brain Singularity', icon: '✨', unlockTaps: 5_000_000,   tapPowerBonus: 5, desc: 'Unlock at 5M taps' },
  ],

  // ─── Guild Wars ───────────────────────────────────────────────────────────────

  GUILD_WAR_TOP_REWARDS: [100, 60, 40, 20, 10],

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
