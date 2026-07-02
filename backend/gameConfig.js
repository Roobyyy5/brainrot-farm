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
    { weight: 6,  type: 'item',         item: 'energy_potion',                         label: '⚡ Energy Potion' },
    { weight: 4,  type: 'item',         item: 'xp_scroll',                             label: '📜 XP Scroll' },
    { weight: 2,  type: 'item',         item: 'gem_bomb',                              label: '💣 Gem Bomb' },
    { weight: 1,  type: 'item',         item: 'crit_shield',                           label: '🛡️ Crit Shield' },
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

  // ─── Prestige Shop ────────────────────────────────────────────────────────────

  PRESTIGE_SHOP: [
    { key: 'eternal_tap',   name: 'Eternal Tap',    icon: '⚡', maxLevel: 5, costPerLevel: 1, desc: '+1 tap power per level (permanent)' },
    { key: 'vast_energy',   name: 'Vast Energy',    icon: '🔋', maxLevel: 5, costPerLevel: 2, desc: '+500 max energy per level (permanent)' },
    { key: 'gem_vault',     name: 'Gem Vault',      icon: '💎', maxLevel: 3, costPerLevel: 2, desc: '+1% gem drop per level (permanent)' },
    { key: 'prestige_aura', name: 'Prestige Aura',  icon: '✨', maxLevel: 3, costPerLevel: 3, desc: '+10% all income per level (permanent)' },
    { key: 'boss_crusher',  name: 'Boss Crusher',   icon: '👾', maxLevel: 3, costPerLevel: 2, desc: '+20% boss damage per level (permanent)' },
  ],

  // ─── Boss Rush ────────────────────────────────────────────────────────────────

  BOSS_RUSH_BASE_HP: 5000,
  BOSS_RUSH_WAVES: [
    { wave: 1,  name: 'Nano Brain',       hpMult: 1,    bpReward: 50,    gemReward: 0 },
    { wave: 2,  name: 'Micro Neuron',     hpMult: 2,    bpReward: 120,   gemReward: 0 },
    { wave: 3,  name: 'Mini Cortex',      hpMult: 4,    bpReward: 280,   gemReward: 0 },
    { wave: 4,  name: 'Data Ghost',       hpMult: 8,    bpReward: 600,   gemReward: 0 },
    { wave: 5,  name: 'Memory Titan',     hpMult: 16,   bpReward: 1200,  gemReward: 2 },
    { wave: 6,  name: 'Synapse Storm',    hpMult: 32,   bpReward: 2500,  gemReward: 3 },
    { wave: 7,  name: 'Logic Leviathan',  hpMult: 64,   bpReward: 5000,  gemReward: 5 },
    { wave: 8,  name: 'Axon Avenger',     hpMult: 128,  bpReward: 10000, gemReward: 8 },
    { wave: 9,  name: 'Cortex Colossus',  hpMult: 256,  bpReward: 20000, gemReward: 12 },
    { wave: 10, name: '⚠️ OMEGA BRAIN',   hpMult: 512,  bpReward: 50000, gemReward: 30 },
  ],

  // ─── Inventory Items ──────────────────────────────────────────────────────────

  INVENTORY_ITEMS: [
    { key: 'energy_potion', name: 'Energy Potion', icon: '⚡', desc: 'Instantly refill energy to max',       rarity: 'common' },
    { key: 'xp_scroll',     name: 'XP Scroll',     icon: '📜', desc: '+500 Battle Pass XP',                 rarity: 'uncommon' },
    { key: 'crit_shield',   name: 'Crit Shield',   icon: '🛡️', desc: '100% crit rate for 60 seconds',       rarity: 'rare' },
    { key: 'gem_bomb',      name: 'Gem Bomb',       icon: '💣', desc: '+5 gems instantly',                    rarity: 'uncommon' },
  ],

  INVENTORY_ITEM_RARITY_COLOR: { common: '#9ca3af', uncommon: '#34d399', rare: '#60a5fa' },

  // ─── Weekly Events ────────────────────────────────────────────────────────────

  WEEKLY_EVENTS: [
    { key: 'double_xp',    name: 'Double XP Week',  icon: '📚', desc: 'Battle Pass XP ×2',       effect: 'bpXpMult',     value: 2 },
    { key: 'gem_rain',     name: 'Gem Rain',         icon: '💎', desc: 'Gem drop chance ×3',       effect: 'gemDropMult',  value: 3 },
    { key: 'boss_week',    name: 'Boss Week',        icon: '👾', desc: 'Boss rewards ×2',           effect: 'bossRewardMult', value: 2 },
    { key: 'energy_surge', name: 'Energy Surge',     icon: '⚡', desc: 'Energy regen ×2',           effect: 'regenMult',    value: 2 },
    { key: 'coin_storm',   name: 'Coin Storm',       icon: '💰', desc: 'All BP earnings ×1.5',     effect: 'bpMult',       value: 1.5 },
  ],

  getCurrentWeeklyEvent() {
    const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const events = module.exports.WEEKLY_EVENTS;
    return events[week % events.length];
  },

  // ─── Tournament ────────────────────────────────────────────────────────────────

  TOURNAMENT_DURATION_MS: 48 * 60 * 60 * 1000,
  TOURNAMENT_PRIZE_SKINS: ['skin_fire', 'skin_diamond', 'skin_crown'],
  TOURNAMENT_TOP_GEMS:    [200, 100, 50, 25, 10, 10, 5, 5, 5, 5],

  // ─── Round 7: Tap Rush ────────────────────────────────────────────────────────

  TAP_RUSH_DURATION_MS:  30 * 1000,
  TAP_RUSH_COOLDOWN_MS:  4 * 60 * 60 * 1000,
  TAP_RUSH_MULTIPLIER:   8,

  // ─── Round 7: World Boss ──────────────────────────────────────────────────────

  WORLD_BOSS_HP:          10_000_000,
  WORLD_BOSS_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
  WORLD_BOSS_NAMES:       ['Sigma Lord', 'Brainrot Titan', 'Ohio Overlord', 'Skibidi God'],
  WORLD_BOSS_TOP_GEMS:    [200, 150, 100, 75, 50, 30, 20, 10, 10, 10],

  // ─── Round 7: Guild Raid ──────────────────────────────────────────────────────

  GUILD_RAID_BASE_HP: 500_000,
  GUILD_RAID_WAVES: [
    { wave: 1, name: 'Raid Alpha', hpMult: 1,  bpReward: 10_000,  gemReward: 5  },
    { wave: 2, name: 'Raid Beta',  hpMult: 2,  bpReward: 25_000,  gemReward: 10 },
    { wave: 3, name: 'Raid Gamma', hpMult: 5,  bpReward: 60_000,  gemReward: 20 },
    { wave: 4, name: 'Raid Delta', hpMult: 10, bpReward: 120_000, gemReward: 35 },
    { wave: 5, name: 'Raid Omega', hpMult: 20, bpReward: 250_000, gemReward: 60 },
  ],

  // ─── Round 7: Crafting ────────────────────────────────────────────────────────

  CRAFTING_RECIPES: [
    { key: 'craft_uncommon', name: 'Craft Uncommon', inputs: [{ key: 'energy_potion', qty: 3 }], output: { key: 'xp_scroll',   qty: 1 } },
    { key: 'craft_rare',     name: 'Craft Rare',     inputs: [{ key: 'xp_scroll',     qty: 3 }], output: { key: 'gem_bomb',    qty: 1 } },
    { key: 'craft_shield',   name: 'Craft Shield',   inputs: [{ key: 'gem_bomb',      qty: 2 }], output: { key: 'crit_shield', qty: 1 } },
  ],

  // ─── Round 7: Season ──────────────────────────────────────────────────────────

  SEASON_DURATION_TAPPER_MS: 28 * 24 * 60 * 60 * 1000,
  SEASON_TOP_GEMS:   [500, 300, 200, 100, 75, 50, 50, 30, 30, 30],
  SEASON_TROPHY_ICONS: { 1: '🥇', 2: '🥈', 3: '🥉' },

  // ─── Round 7: Referral Leaderboard ───────────────────────────────────────────

  REFERRAL_TOP_GEMS: [100, 75, 50, 25, 10, 10, 5, 5, 5, 5],

  // ─── Elite Layer 1: Active Abilities ─────────────────────────────────────────

  ACTIVE_ABILITIES: {
    brain_burst: {
      name: 'Brain Burst',
      icon: '💥',
      desc: '×10 tap power for 3 seconds',
      cooldownMs: 2 * 60 * 1000,
      durationMs: 3 * 1000,
      effect: 'tap_mult',
      value: 10,
    },
    frenzy: {
      name: 'Frenzy',
      icon: '⚡',
      desc: '-50% energy cost for 5 seconds',
      cooldownMs: 3 * 60 * 1000,
      durationMs: 5 * 1000,
      effect: 'energy_cost_mult',
      value: 0.5,
    },
    golden_tap: {
      name: 'Golden Tap',
      icon: '✨',
      desc: '100% crit rate for next 20 taps',
      cooldownMs: 5 * 60 * 1000,
      durationMs: null,
      effect: 'golden_taps',
      value: 20,
    },
    energy_nova: {
      name: 'Energy Nova',
      icon: '🔮',
      desc: 'Instant full energy refill + 5s free tapping',
      cooldownMs: 4 * 60 * 1000,
      durationMs: 5 * 1000,
      effect: 'energy_nova',
      value: 0,
    },
  },

  // ─── Elite Layer 2: Server-side Combo ────────────────────────────────────────

  COMBO_WINDOW_MS: 1500,
  COMBO_TIERS: [
    { batches: 0,  mult: 1,  name: 'Bronze',   color: '#cd7f32', icon: '🥉' },
    { batches: 5,  mult: 2,  name: 'Silver',   color: '#c0c5ce', icon: '🥈' },
    { batches: 10, mult: 3,  name: 'Gold',     color: '#f5c344', icon: '🥇' },
    { batches: 20, mult: 5,  name: 'Platinum', color: '#00e5ff', icon: '💎' },
    { batches: 30, mult: 10, name: 'Diamond',  color: '#ff4fa3', icon: '🔮' },
  ],

  getComboMult(batches) {
    const tiers = module.exports.COMBO_TIERS;
    let mult = 1;
    for (const t of tiers) {
      if (batches >= t.batches) mult = t.mult;
    }
    return mult;
  },

  getComboTier(batches) {
    const tiers = module.exports.COMBO_TIERS;
    let tier = tiers[0];
    for (const t of tiers) {
      if (batches >= t.batches) tier = t;
    }
    return tier;
  },

  // ─── Elite Layer 4: Ascension Tree ───────────────────────────────────────────

  ASCENSION_REQUIRED_PRESTIGES: 5,

  ASCENSION_TREE: {
    brain_forge: {
      name: 'Brain Forge',
      icon: '🔨',
      maxLevel: 5,
      desc: '+2 tap power per level (permanent, stacks with prestige)',
      costPerLevel: 1,
    },
    infinity_vessel: {
      name: 'Infinity Vessel',
      icon: '♾️',
      maxLevel: 5,
      desc: '+1000 max energy per level',
      costPerLevel: 1,
    },
    soul_regen: {
      name: 'Soul Regen',
      icon: '🌊',
      maxLevel: 5,
      desc: '+5 energy regen/sec per level',
      costPerLevel: 2,
    },
    cosmic_luck: {
      name: 'Cosmic Luck',
      icon: '🌌',
      maxLevel: 3,
      desc: '+5% gem drop chance per level',
      costPerLevel: 2,
    },
    ascended_crits: {
      name: 'Ascended Crits',
      icon: '💫',
      maxLevel: 3,
      desc: 'Crit multiplier ×20 per level (additive)',
      costPerLevel: 3,
    },
    time_warp: {
      name: 'Time Warp',
      icon: '⏰',
      maxLevel: 1,
      desc: 'Ability cooldowns reduced by 50%',
      costPerLevel: 5,
    },
  },

  // ─── Elite Layer 5: ELO / Ranked Duels ───────────────────────────────────────

  ELO_START: 1000,
  ELO_K_FACTOR: 32,
  ELO_MATCHMAKING_RANGE: 150,
  RANKED_DUEL_DURATION_MS: 60 * 1000,
  RANKED_DUEL_SEASON: 1,

  ELO_LEAGUES: [
    { name: 'Rookie',  minElo: 0,    icon: '🔘', gemReward: 5 },
    { name: 'Bronze',  minElo: 1100, icon: '🥉', gemReward: 15 },
    { name: 'Silver',  minElo: 1300, icon: '🥈', gemReward: 35 },
    { name: 'Gold',    minElo: 1500, icon: '🥇', gemReward: 75 },
    { name: 'Legend',  minElo: 1800, icon: '🏆', gemReward: 200 },
  ],

  getLeagueForElo(elo) {
    const leagues = module.exports.ELO_LEAGUES;
    let league = leagues[0];
    for (const l of leagues) {
      if (elo >= l.minElo) league = l;
    }
    return league;
  },

  computeEloChange(winnerElo, loserElo) {
    const K = module.exports.ELO_K_FACTOR;
    const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const gain = Math.round(K * (1 - expected));
    return { gain, loss: Math.round(K * expected) };
  },

  // ─── Elite Layer 6: Artifacts ─────────────────────────────────────────────────

  ARTIFACT_RARITIES: ['common', 'rare', 'epic', 'legendary'],

  ARTIFACT_DEFINITIONS: {
    // Weapons — tap power bonuses
    iron_fist:     { slot: 'weapon', rarity: 'common',    name: 'Iron Fist',      icon: '👊', stats: { tapPower: 2 } },
    steel_brain:   { slot: 'weapon', rarity: 'rare',      name: 'Steel Brain',    icon: '🔩', stats: { tapPower: 5 } },
    golden_mind:   { slot: 'weapon', rarity: 'epic',      name: 'Golden Mind',    icon: '🧠', stats: { tapPower: 12, critChance: 0.05 } },
    omega_tap:     { slot: 'weapon', rarity: 'legendary', name: 'Omega Tap',      icon: '⚡', stats: { tapPower: 25, critChance: 0.10, tapMult: 1.5 } },
    // Armor — energy bonuses
    leather_skull: { slot: 'armor',  rarity: 'common',    name: 'Leather Skull',  icon: '💀', stats: { energyMax: 500 } },
    iron_helmet:   { slot: 'armor',  rarity: 'rare',      name: 'Iron Helmet',    icon: '⛑️', stats: { energyMax: 1200, regenBonus: 2 } },
    crystal_core:  { slot: 'armor',  rarity: 'epic',      name: 'Crystal Core',   icon: '💠', stats: { energyMax: 2500, regenBonus: 5 } },
    void_shell:    { slot: 'armor',  rarity: 'legendary', name: 'Void Shell',     icon: '🌑', stats: { energyMax: 5000, regenBonus: 10, efficiencyPct: 20 } },
    // Relics — passive income bonuses
    bronze_relic:  { slot: 'relic',  rarity: 'common',    name: 'Bronze Relic',   icon: '🏺', stats: { cardBoostPct: 10 } },
    silver_relic:  { slot: 'relic',  rarity: 'rare',      name: 'Silver Relic',   icon: '🥈', stats: { cardBoostPct: 25 } },
    gold_relic:    { slot: 'relic',  rarity: 'epic',      name: 'Gold Relic',     icon: '🏆', stats: { cardBoostPct: 50, offlinePct: 20 } },
    eternal_relic: { slot: 'relic',  rarity: 'legendary', name: 'Eternal Relic',  icon: '✨', stats: { cardBoostPct: 100, offlinePct: 50, gemDropPct: 0.03 } },
    // Charms — luck / gem bonuses
    lucky_coin:    { slot: 'charm',  rarity: 'common',    name: 'Lucky Coin',     icon: '🪙', stats: { gemDropPct: 0.02 } },
    four_leaf:     { slot: 'charm',  rarity: 'rare',      name: 'Four-Leaf',      icon: '🍀', stats: { gemDropPct: 0.05, critChance: 0.03 } },
    prismatic_gem: { slot: 'charm',  rarity: 'epic',      name: 'Prismatic Gem',  icon: '💎', stats: { gemDropPct: 0.08, tapMult: 1.2 } },
    chaos_stone:   { slot: 'charm',  rarity: 'legendary', name: 'Chaos Stone',    icon: '🌀', stats: { gemDropPct: 0.15, tapMult: 2.0, critChance: 0.10 } },
  },

  ARTIFACT_COMBINE_COUNT: 3,

  // ── Layer 8: Artifact Set Bonuses ─────────────────────────────────────────
  ARTIFACT_SETS: {
    iron_warrior:   { name: 'Iron Warrior',    pieces: ['iron_fist',    'leather_skull'], bonus: { tapPower: 5,  energyMax: 500 },             icon: '⚔️' },
    crystal_mage:   { name: 'Crystal Mage',    pieces: ['steel_brain',  'iron_helmet'],   bonus: { critChance: 0.05, tapMult: 1.3 },            icon: '🔮' },
    golden_legend:  { name: 'Golden Legend',   pieces: ['golden_mind',  'crystal_core'],  bonus: { tapPower: 15, gemDropPct: 0.05 },            icon: '✨' },
    void_reaper:    { name: 'Void Reaper',     pieces: ['omega_tap',    'void_shell'],    bonus: { tapMult: 2.0, critChance: 0.15, regenBonus: 10 }, icon: '🌑' },
    nature_spirit:  { name: 'Nature Spirit',   pieces: ['lucky_coin',   'bronze_relic'],  bonus: { gemDropPct: 0.03, cardBoostPct: 15 },        icon: '🌿' },
    chaos_master:   { name: 'Chaos Master',    pieces: ['chaos_stone',  'eternal_relic'], bonus: { tapMult: 3.0, offlinePct: 75 },              icon: '🌀' },
    full_legendary: { name: 'FULL LEGEND SET', pieces: ['omega_tap','void_shell','eternal_relic','chaos_stone'], bonus: { tapMult: 5.0, critChance: 0.25, gemDropPct: 0.15, energyMax: 10000 }, icon: '💥' },
  },

  getArtifactSetBonuses(equippedKeys) {
    const sets = module.exports.ARTIFACT_SETS;
    const equipped = new Set(equippedKeys);
    const active = [];
    const totalBonus = { tapPower: 0, energyMax: 0, regenBonus: 0, efficiencyPct: 0, gemDropPct: 0, critChance: 0, tapMult: 1, cardBoostPct: 0, offlinePct: 0 };
    for (const [key, set] of Object.entries(sets)) {
      if (set.pieces.every(p => equipped.has(p))) {
        active.push({ key, ...set });
        for (const [stat, val] of Object.entries(set.bonus)) {
          if (stat === 'tapMult') totalBonus.tapMult *= val;
          else totalBonus[stat] = (totalBonus[stat] || 0) + val;
        }
      }
    }
    return { active, totalBonus };
  },

  // ── Layer 10: Mastery System ───────────────────────────────────────────────
  MASTERY_XP_PER_UPGRADE: 10,
  MASTERY_LEVEL_XP: 50,
  MASTERY_MAX_LEVEL: 100,

  MASTERY_MILESTONES: {
    10:  { type: 'pct_bonus', value: 5,   label: '+5% effect' },
    25:  { type: 'pct_bonus', value: 10,  label: '+10% effect' },
    50:  { type: 'pct_bonus', value: 15,  label: '+15% effect + skin' },
    75:  { type: 'pct_bonus', value: 20,  label: '+20% effect' },
    100: { type: 'pct_bonus', value: 30,  label: '+30% effect (MASTERED)' },
  },

  getMasteryBonus(level) {
    const milestones = module.exports.MASTERY_MILESTONES;
    let pct = 0;
    for (const [lvl, m] of Object.entries(milestones)) {
      if (level >= Number(lvl)) pct = m.value;
    }
    return pct;
  },

  // ── Layer 11: Tap Challenges ───────────────────────────────────────────────
  TAP_CHALLENGES: [
    { key: 'sprint_1000',  name: 'Sprint 1K',      icon: '⚡', desc: 'Tap 1000 times in 60 seconds',    timeLimit: 60,  tapTarget: 1000,  rewardGems: 10,  difficulty: 'easy'   },
    { key: 'burst_500',    name: 'Burst 500',       icon: '💥', desc: 'Tap 500 times in 20 seconds',     timeLimit: 20,  tapTarget: 500,   rewardGems: 15,  difficulty: 'medium' },
    { key: 'no_boost_500', name: 'Clean 500',       icon: '🧘', desc: '500 taps — no active abilities',  timeLimit: 30,  tapTarget: 500,   rewardGems: 20,  noAbilities: true,   difficulty: 'hard'   },
    { key: 'marathon_5k',  name: 'Marathon 5K',     icon: '🏃', desc: 'Tap 5000 times in 5 minutes',     timeLimit: 300, tapTarget: 5000,  rewardGems: 25,  difficulty: 'medium' },
    { key: 'ultra_10k',    name: 'Ultra 10K',       icon: '🔥', desc: 'Tap 10000 times in 10 minutes',   timeLimit: 600, tapTarget: 10000, rewardGems: 50,  difficulty: 'hard'   },
    { key: 'godlike_30s',  name: 'Godlike 30s',     icon: '🌟', desc: 'Maximum taps possible in 30s',    timeLimit: 30,  tapTarget: null,  rewardGems: 30,  scoreMode: true,     difficulty: 'legend' },
  ],

  // ── Layer 12: Seasonal Narrative ──────────────────────────────────────────
  SEASON_NARRATIVES: [
    {
      season: 1,
      name: 'Brain Awakening',
      icon: '🧠',
      theme: 'origin',
      story: 'The first neurons fire. A mind stirs from nothing. You are the spark.',
      mechanic: 'standard',
      bossNameOverride: null,
      bpMultiplier: 1,
      specialDrop: null,
    },
    {
      season: 2,
      name: 'Quantum Apocalypse',
      icon: '⚛️',
      theme: 'chaos',
      story: 'Reality fractures. Every tap echoes through parallel dimensions. Crits are doubled — but bosses have 3× HP.',
      mechanic: 'double_crits',
      bpMultiplier: 1,
      critMultOverride: 2,
      bossHpMultOverride: 3,
      specialDrop: 'chaos_stone',
    },
    {
      season: 3,
      name: 'Elite Era',
      icon: '💎',
      theme: 'prestige',
      story: 'The age of gods. Artifacts pulse with ancient power. Ascension calls.',
      mechanic: 'artifact_boost',
      bpMultiplier: 1.5,
      artifactDropBonus: 2,
      specialDrop: 'eternal_relic',
    },
    {
      season: 4,
      name: 'Void Storm',
      icon: '🌀',
      theme: 'endgame',
      story: 'The void consumes all. Only the strongest survive. Every second counts.',
      mechanic: 'energy_drain',
      bpMultiplier: 2,
      energyDrainRate: 2,
      specialDrop: 'void_shell',
    },
  ],

  getSeasonNarrative(seasonNum) {
    const narratives = module.exports.SEASON_NARRATIVES;
    return narratives[(seasonNum - 1) % narratives.length] || narratives[0];
  },

  // ── Layer 13: Guild Skill Tree ────────────────────────────────────────────
  GUILD_XP_PER_TAP: 1,
  GUILD_LEVEL_XP: 500,
  GUILD_MAX_LEVEL: 30,

  GUILD_SKILLS: {
    tap_sync: {
      name: 'Tap Sync',
      icon: '⚡',
      desc: '+2% tap power for all members per level',
      maxLevel: 10,
      costPerLevel: 100,
      branch: 'offense',
      effect: (lvl) => ({ tapPctBonus: lvl * 2 }),
    },
    energy_grid: {
      name: 'Energy Grid',
      icon: '🔋',
      desc: '+200 max energy for all members per level',
      maxLevel: 10,
      costPerLevel: 100,
      branch: 'defense',
      effect: (lvl) => ({ energyBonus: lvl * 200 }),
    },
    loot_protocol: {
      name: 'Loot Protocol',
      icon: '💎',
      desc: '+1% gem drop chance per level',
      maxLevel: 5,
      costPerLevel: 200,
      branch: 'economy',
      effect: (lvl) => ({ gemDropPct: lvl * 0.01 }),
    },
    boss_cracker: {
      name: 'Boss Cracker',
      icon: '💣',
      desc: '+5% boss damage per level',
      maxLevel: 8,
      costPerLevel: 150,
      branch: 'offense',
      effect: (lvl) => ({ bossDamagePct: lvl * 5 }),
    },
    passive_matrix: {
      name: 'Passive Matrix',
      icon: '🤖',
      desc: '+10% offline income for all members per level',
      maxLevel: 8,
      costPerLevel: 150,
      branch: 'economy',
      effect: (lvl) => ({ offlinePct: lvl * 10 }),
    },
    war_drums: {
      name: 'War Drums',
      icon: '🥁',
      desc: '+5% damage in bracket wars per level',
      maxLevel: 5,
      costPerLevel: 300,
      branch: 'war',
      effect: (lvl) => ({ bracketDmgPct: lvl * 5 }),
    },
  },

  getGuildBonuses(skillMap) {
    const GUILD_SKILLS = module.exports.GUILD_SKILLS;
    const result = { tapPctBonus: 0, energyBonus: 0, gemDropPct: 0, bossDamagePct: 0, offlinePct: 0, bracketDmgPct: 0 };
    for (const [key, lvl] of Object.entries(skillMap)) {
      const def = GUILD_SKILLS[key];
      if (!def || lvl <= 0) continue;
      const eff = def.effect(lvl);
      for (const [stat, val] of Object.entries(eff)) {
        result[stat] = (result[stat] || 0) + val;
      }
    }
    return result;
  },

  // ── Layer 15: Live World Events ───────────────────────────────────────────
  LIVE_WORLD_EVENTS: [
    { key: 'meteor_shower',  name: 'Meteor Shower',   icon: '☄️',  durationMs: 3 * 60 * 1000, desc: 'Tap power ×2 for all players',      effect: 'tapMult',      value: 2    },
    { key: 'brain_storm',    name: 'Brain Storm',     icon: '🌩️', durationMs: 5 * 60 * 1000, desc: 'Combo decay disabled — keep your streak!', effect: 'noComboDecay', value: 1    },
    { key: 'gem_rain',       name: 'Gem Rain',        icon: '💎',  durationMs: 4 * 60 * 1000, desc: 'Every 5th tap drops a gem',         effect: 'gemFreq',      value: 5    },
    { key: 'void_surge',     name: 'Void Surge',      icon: '🌀',  durationMs: 2 * 60 * 1000, desc: 'All crits auto-hit for 2 minutes',  effect: 'autoCrit',     value: 1    },
    { key: 'energy_flood',   name: 'Energy Flood',    icon: '🌊',  durationMs: 6 * 60 * 1000, desc: 'Energy regen ×3 globally',          effect: 'regenMult',    value: 3    },
    { key: 'xp_frenzy',     name: 'XP Frenzy',       icon: '🔥',  durationMs: 5 * 60 * 1000, desc: 'Mastery XP gain ×5',               effect: 'masteryMult',  value: 5    },
  ],
  LIVE_EVENT_COOLDOWN_MS: 55 * 60 * 1000,
  LIVE_EVENT_MIN_GAP_MS:  50 * 60 * 1000,

  // ── Layer 17: Boss Ecosystem ──────────────────────────────────────────────
  BOSS_ECOSYSTEM: [
    {
      key: 'inferno_titan',
      name: 'Inferno Titan',
      icon: '🔥',
      type: 'fire',
      weakness: 'water',
      baseHp: 500_000,
      respawnMs: 4 * 60 * 60 * 1000,
      loot: { gems: 20, artifactKeys: ['chaos_stone'], xp: 500 },
      weaknessArtifacts: ['void_shell', 'crystal_core'],
    },
    {
      key: 'void_leviathan',
      name: 'Void Leviathan',
      icon: '🌀',
      type: 'void',
      weakness: 'light',
      baseHp: 750_000,
      respawnMs: 6 * 60 * 60 * 1000,
      loot: { gems: 30, artifactKeys: ['void_shell'], xp: 750 },
      weaknessArtifacts: ['omega_tap', 'golden_mind'],
    },
    {
      key: 'crystal_colossus',
      name: 'Crystal Colossus',
      icon: '💠',
      type: 'ice',
      weakness: 'fire',
      baseHp: 400_000,
      respawnMs: 3 * 60 * 60 * 1000,
      loot: { gems: 15, artifactKeys: ['crystal_core'], xp: 400 },
      weaknessArtifacts: ['iron_fist', 'chaos_stone'],
    },
    {
      key: 'thunder_deity',
      name: 'Thunder Deity',
      icon: '⚡',
      type: 'lightning',
      weakness: 'earth',
      baseHp: 1_000_000,
      respawnMs: 8 * 60 * 60 * 1000,
      loot: { gems: 50, artifactKeys: ['omega_tap'], xp: 1000 },
      weaknessArtifacts: ['bronze_relic', 'leather_skull'],
    },
    {
      key: 'arcane_overlord',
      name: 'Arcane Overlord',
      icon: '🔮',
      type: 'arcane',
      weakness: 'void',
      baseHp: 2_000_000,
      respawnMs: 12 * 60 * 60 * 1000,
      loot: { gems: 100, artifactKeys: ['eternal_relic', 'chaos_stone'], xp: 2000 },
      weaknessArtifacts: ['void_shell', 'chaos_stone'],
    },
  ],

  // ── Layer 19: Quest Board ──────────────────────────────────────────────────
  questDayKey: () => new Date().toISOString().slice(0, 10),
  questWeekKey: () => {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  },

  DAILY_QUEST_POOL: [
    { key: 'tap_500',       name: 'Tap 500 Times',        icon: '👆', type: 'taps',      target: 500,   reward: { gems: 3  } },
    { key: 'tap_2000',      name: 'Tap 2000 Times',       icon: '⚡', type: 'taps',      target: 2000,  reward: { gems: 8  } },
    { key: 'spend_energy',  name: 'Spend 1000 Energy',    icon: '🔋', type: 'energy',    target: 1000,  reward: { gems: 5  } },
    { key: 'boss_hit',      name: 'Hit Any Boss',         icon: '💥', type: 'boss_hit',  target: 1,     reward: { gems: 4  } },
    { key: 'earn_bp',       name: 'Earn 50K BP',          icon: '🧠', type: 'bp_earned', target: 50000, reward: { gems: 6  } },
    { key: 'combo_gold',    name: 'Reach Gold Combo',     icon: '🥇', type: 'combo_tier',target: 3,     reward: { gems: 5  } },
    { key: 'gem_drop',      name: 'Get 3 Gem Drops',      icon: '💎', type: 'gem_drops', target: 3,     reward: { gems: 4  } },
    { key: 'guild_contrib', name: 'Contribute to Guild',  icon: '🏰', type: 'guild_xp',  target: 50,    reward: { gems: 4  } },
  ],

  WEEKLY_QUESTS: [
    { key: 'w_tap_20k',    name: 'Tap 20,000 Times',      icon: '🔥', type: 'taps',      target: 20000,  reward: { gems: 30, artifactKey: 'iron_fist'  } },
    { key: 'w_prestige',   name: 'Prestige Once',         icon: '✨', type: 'prestige',   target: 1,      reward: { gems: 50 } },
    { key: 'w_boss_kills', name: 'Kill 3 Ecosystem Bosses',icon: '☠️', type: 'boss_kills', target: 3,      reward: { gems: 40, artifactKey: 'four_leaf'  } },
    { key: 'w_challenges', name: 'Complete 5 Challenges', icon: '⚡', type: 'challenges', target: 5,      reward: { gems: 35 } },
  ],

  DAILY_QUEST_CHEST: { gems: 15, artifactChance: 0.5 },

  // ── Layer 20: Cooperative Raid ────────────────────────────────────────────
  COOP_RAID_BOSSES: [
    { key: 'mega_brain',   name: 'Mega Brain',     icon: '🧠', hp: 5_000_000,  maxPlayers: 10, durationMs: 10 * 60 * 1000, loot: { gems: 50, topBonus: 25 } },
    { key: 'omega_void',   name: 'Omega Void',     icon: '🌑', hp: 10_000_000, maxPlayers: 10, durationMs: 15 * 60 * 1000, loot: { gems: 80, topBonus: 40 } },
    { key: 'titan_forge',  name: 'Titan Forge',    icon: '⚒️', hp: 20_000_000, maxPlayers: 10, durationMs: 20 * 60 * 1000, loot: { gems: 150, topBonus: 75 } },
  ],
  COOP_RAID_LOBBY_EXPIRE_MS: 5 * 60 * 1000,

  // ── Layer 21: Prestige Relics ─────────────────────────────────────────────
  RELIC_DEFINITIONS: {
    time_crystal: {
      name: 'Time Crystal',
      icon: '🔷',
      rarity: 'relic',
      requiredAscension: 3,
      passiveDesc: '+15 tap power always',
      passiveStats: { tapPower: 15 },
      activeDesc: 'Freeze combo decay for 60 seconds',
      activeCooldownMs: 5 * 60 * 1000,
      activeDurationMs: 60 * 1000,
      activeEffect: 'freeze_combo',
    },
    neural_core: {
      name: 'Neural Core',
      icon: '🧬',
      rarity: 'relic',
      requiredAscension: 3,
      passiveDesc: '+10% gem drop chance always',
      passiveStats: { gemDropPct: 0.10 },
      activeDesc: 'Auto-tap 10/sec for 2 minutes',
      activeCooldownMs: 10 * 60 * 1000,
      activeDurationMs: 2 * 60 * 1000,
      activeEffect: 'auto_tap',
    },
    void_prism: {
      name: 'Void Prism',
      icon: '🔮',
      rarity: 'relic',
      requiredAscension: 4,
      passiveDesc: '×1.5 offline income always',
      passiveStats: { offlineMult: 1.5 },
      activeDesc: '×3 gem drops for 30 seconds',
      activeCooldownMs: 8 * 60 * 1000,
      activeDurationMs: 30 * 1000,
      activeEffect: 'gem_surge',
    },
    soul_anchor: {
      name: 'Soul Anchor',
      icon: '⚓',
      rarity: 'relic',
      requiredAscension: 5,
      passiveDesc: '+500 energy cap, +5 regen/sec',
      passiveStats: { energyMax: 500, regenBonus: 5 },
      activeDesc: 'Infinite energy for 45 seconds',
      activeCooldownMs: 12 * 60 * 1000,
      activeDurationMs: 45 * 1000,
      activeEffect: 'infinite_energy',
    },
    chaos_core: {
      name: 'Chaos Core',
      icon: '🌀',
      rarity: 'relic',
      requiredAscension: 5,
      passiveDesc: '+25% crit chance, ×2 crit mult',
      passiveStats: { critChance: 0.25, critMult: 2 },
      activeDesc: '100% crit + ×5 crit mult for 20 seconds',
      activeCooldownMs: 15 * 60 * 1000,
      activeDurationMs: 20 * 1000,
      activeEffect: 'crit_storm',
    },
  },

  // ── Layer 22: Division Leagues ────────────────────────────────────────────
  DIVISION_SIZE: 20,
  DIVISION_TIERS: [
    { name: 'Iron',     icon: '⚙️',  minRank: 1,  promote: 3, relegate: 5, gemReward: 10  },
    { name: 'Bronze',   icon: '🥉',  minRank: 1,  promote: 3, relegate: 5, gemReward: 20  },
    { name: 'Silver',   icon: '🥈',  minRank: 1,  promote: 3, relegate: 5, gemReward: 40  },
    { name: 'Gold',     icon: '🥇',  minRank: 1,  promote: 3, relegate: 5, gemReward: 80  },
    { name: 'Platinum', icon: '💎',  minRank: 1,  promote: 3, relegate: 5, gemReward: 150 },
    { name: 'Diamond',  icon: '🔮',  minRank: 1,  promote: 3, relegate: 0, gemReward: 300 },
  ],

  divisionWeekKey: () => `div-${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`,

  // ── Layer 23: Upgrade Synergies ───────────────────────────────────────────
  UPGRADE_SYNERGIES: [
    {
      key: 'hyper_tap',
      name: 'Hyper Tap',
      icon: '⚡',
      desc: 'MAX Tap Power + MAX Multi-Tap → permanent ×1.5 tap bonus',
      requires: { TAP_POWER: 5, MULTI_TAP: 3 },
      bonus: { tapMult: 1.5 },
      color: '#f59e0b',
    },
    {
      key: 'infinite_loop',
      name: 'Infinite Loop',
      icon: '♾️',
      desc: 'MAX Auto Brain + MAX Regen Rate → +5 passive BP/sec',
      requires: { AUTO_BRAIN: 5, REGEN_RATE: 5 },
      bonus: { passiveBpSec: 5 },
      color: '#34d399',
    },
    {
      key: 'quantum_battery',
      name: 'Quantum Battery',
      icon: '🔋',
      desc: 'MAX Energy Max + MAX Regen Rate → energy overflow gives tap bonus',
      requires: { ENERGY_MAX: 5, REGEN_RATE: 5 },
      bonus: { energyOverflowTap: true },
      color: '#00e5ff',
    },
    {
      key: 'omega_brain',
      name: 'Omega Brain',
      icon: '🧠',
      desc: 'ALL 5 upgrades maxed → global ×2 BP multiplier',
      requires: { TAP_POWER: 5, ENERGY_MAX: 5, REGEN_RATE: 5, MULTI_TAP: 3, AUTO_BRAIN: 5 },
      bonus: { globalBpMult: 2 },
      color: '#ff4fa3',
    },
    {
      key: 'tap_engine',
      name: 'Tap Engine',
      icon: '🔧',
      desc: 'MAX Tap Power + MAX Auto Brain → auto-brain earns ×3',
      requires: { TAP_POWER: 5, AUTO_BRAIN: 5 },
      bonus: { autoBrainMult: 3 },
      color: '#8b5cf6',
    },
    {
      key: 'energy_god',
      name: 'Energy God',
      icon: '⚡',
      desc: 'MAX Energy Max + MAX Multi-Tap → multi-tap costs 0 extra energy',
      requires: { ENERGY_MAX: 5, MULTI_TAP: 3 },
      bonus: { freeMultiTap: true },
      color: '#6366f1',
    },
  ],

  getActiveSynergies(profile) {
    const synergies = module.exports.UPGRADE_SYNERGIES;
    const levels = {
      TAP_POWER:  profile.tap_power_level  || 0,
      ENERGY_MAX: profile.energy_max_level || 0,
      REGEN_RATE: profile.regen_rate_level || 0,
      MULTI_TAP:  profile.multi_tap_level  || 0,
      AUTO_BRAIN: profile.auto_brain_level || 0,
    };
    return synergies.filter(s =>
      Object.entries(s.requires).every(([k, v]) => levels[k] >= v)
    );
  },

  // ── Layer 24: Achievement Gallery ────────────────────────────────────────
  ACHIEVEMENT_GALLERY: [
    // Tapper category
    { key: 'tap_bronze',   category: 'tapper', tier: 'bronze',   name: 'Beginner Tapper',   icon: '👆', desc: 'Reach 1,000 total taps',     check: (p) => p.total_taps >= 1000,    reward: { gems: 2  } },
    { key: 'tap_silver',   category: 'tapper', tier: 'silver',   name: 'Skilled Tapper',    icon: '⚡', desc: 'Reach 10,000 taps',          check: (p) => p.total_taps >= 10000,   reward: { gems: 5  } },
    { key: 'tap_gold',     category: 'tapper', tier: 'gold',     name: 'Elite Tapper',      icon: '🥇', desc: 'Reach 100,000 taps',         check: (p) => p.total_taps >= 100000,  reward: { gems: 15 } },
    { key: 'tap_platinum', category: 'tapper', tier: 'platinum', name: 'Tap Grandmaster',   icon: '💎', desc: 'Reach 500,000 taps',         check: (p) => p.total_taps >= 500000,  reward: { gems: 50 } },
    { key: 'tap_diamond',  category: 'tapper', tier: 'diamond',  name: 'GOD OF TAPS',       icon: '🔮', desc: 'Reach 1,000,000 taps',       check: (p) => p.total_taps >= 1000000, reward: { gems: 200 } },
    // Prestige category
    { key: 'prestige_1',   category: 'prestige', tier: 'bronze',   name: 'First Prestige',   icon: '✨', desc: 'Prestige for the first time', check: (p) => p.prestige >= 1,  reward: { gems: 5  } },
    { key: 'prestige_3',   category: 'prestige', tier: 'silver',   name: 'Triple Prestige',  icon: '💫', desc: 'Prestige 3 times',           check: (p) => p.prestige >= 3,  reward: { gems: 15 } },
    { key: 'prestige_5',   category: 'prestige', tier: 'gold',     name: 'Prestige Master',  icon: '🌟', desc: 'Prestige 5 times',           check: (p) => p.prestige >= 5,  reward: { gems: 40 } },
    { key: 'prestige_10',  category: 'prestige', tier: 'platinum', name: 'Legend of Prestige',icon: '🏆', desc: 'Prestige 10 times',         check: (p) => p.prestige >= 10, reward: { gems: 100 } },
    { key: 'ascension_1',  category: 'prestige', tier: 'diamond',  name: 'The Ascended',     icon: '🌌', desc: 'Ascend for the first time',  check: (p) => (p.ascension_count || 0) >= 1, reward: { gems: 300 } },
    // Social category
    { key: 'guild_join',   category: 'social',   tier: 'bronze',   name: 'Team Player',      icon: '🏰', desc: 'Join a guild',               check: (_, ctx) => ctx.inGuild,      reward: { gems: 3  } },
    { key: 'referral_1',   category: 'social',   tier: 'silver',   name: 'Recruiter',        icon: '📢', desc: 'Refer 1 active player',      check: (_, ctx) => ctx.referrals >= 1, reward: { gems: 10 } },
    { key: 'duel_win',     category: 'social',   tier: 'gold',     name: 'Duel Champion',    icon: '⚔️', desc: 'Win 10 ranked duels',        check: (_, ctx) => ctx.duelWins >= 10, reward: { gems: 25 } },
    { key: 'top10_season', category: 'social',   tier: 'platinum', name: 'Season Rival',     icon: '🌐', desc: 'Finish top 10 in a season',  check: (_, ctx) => ctx.seasonTop10,   reward: { gems: 75 } },
    { key: 'boss_kill_5',  category: 'social',   tier: 'diamond',  name: 'Boss Bane',        icon: '💀', desc: 'Kill 5 ecosystem bosses',    check: (_, ctx) => ctx.bossKills >= 5, reward: { gems: 150 } },
  ],

  TIER_ORDER: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
  TIER_COLOR: { bronze: '#cd7f32', silver: '#c0c5ce', gold: '#f5c344', platinum: '#00e5ff', diamond: '#ff4fa3' },
};
