import { getInitData } from './telegram';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const initData = getInitData();
  if (initData) headers['x-telegram-init-data'] = initData;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  register: (ref) => request('/register', { method: 'POST', body: { ref } }),
  farm: () => request('/farm', { method: 'POST' }),
  boost: () => request('/boost', { method: 'POST' }),
  daily: () => request('/daily', { method: 'POST' }),
  leaderboard: (period) => request(`/leaderboard${period === 'weekly' ? '?period=weekly' : ''}`),
  referral: () => request('/referral'),
  achievements: () => request('/achievements'),

  tapper: {
    me: () => request('/tapper'),
    tap: (count, combo) => request('/tapper/tap', { method: 'POST', body: { count, combo } }),
    upgrades: () => request('/tapper/upgrades'),
    upgrade: (type) => request('/tapper/upgrade', { method: 'POST', body: { type } }),
    prestige: () => request('/tapper/prestige', { method: 'POST' }),
    leaderboard: () => request('/tapper/leaderboard'),
    boss: () => request('/tapper/boss'),
    bossTap: (bossId, count) => request('/tapper/boss/tap', { method: 'POST', body: { bossId, count } }),
    talents: () => request('/tapper/talents'),
    chooseTalent: (talentKey) => request('/tapper/talent', { method: 'POST', body: { talentKey } }),
  },

  cards: {
    list: () => request('/cards'),
    buy: (key) => request('/cards/buy', { method: 'POST', body: { key } }),
  },

  wheel: {
    status: () => request('/wheel'),
    spin: () => request('/wheel/spin', { method: 'POST' }),
  },

  missions: {
    list: () => request('/missions'),
    claim: (key) => request('/missions/claim', { method: 'POST', body: { key } }),
  },

  gemshop: {
    status: () => request('/gemshop'),
    buy: (key) => request('/gemshop/buy', { method: 'POST', body: { key } }),
    equipSkin: (skin) => request('/gemshop/skin', { method: 'POST', body: { skin } }),
  },

  skills: {
    list: () => request('/skills'),
    upgrade: (skillKey) => request('/skills/upgrade', { method: 'POST', body: { skillKey } }),
  },

  battlepass: {
    status: () => request('/battlepass'),
    claim: (level, premium) => request('/battlepass/claim', { method: 'POST', body: { level, premium } }),
    buyPremium: () => request('/battlepass/buy-premium', { method: 'POST' }),
  },

  loginstreak: {
    status: () => request('/loginstreak'),
    claim: () => request('/loginstreak/claim', { method: 'POST' }),
  },

  guilds: {
    my: () => request('/guilds/my'),
    search: (q) => request(`/guilds/search?q=${encodeURIComponent(q)}`),
    create: (name, tag, description) => request('/guilds/create', { method: 'POST', body: { name, tag, description } }),
    join: (guildId) => request('/guilds/join', { method: 'POST', body: { guildId } }),
    leave: () => request('/guilds/leave', { method: 'POST' }),
    bossTap: (count) => request('/guilds/boss/tap', { method: 'POST', body: { count } }),
    chat: () => request('/guilds/chat'),
    sendMessage: (message) => request('/guilds/chat', { method: 'POST', body: { message } }),
  },

  duels: {
    list: () => request('/duels'),
    challenge: (username, stakeGems) => request('/duels/challenge', { method: 'POST', body: { username, stakeGems } }),
    accept: (duelId) => request('/duels/accept', { method: 'POST', body: { duelId } }),
    decline: (duelId) => request('/duels/decline', { method: 'POST', body: { duelId } }),
    tap: (duelId, bp) => request('/duels/tap', { method: 'POST', body: { duelId, bp } }),
    resolve: (duelId) => request('/duels/resolve', { method: 'POST', body: { duelId } }),
  },

  dailyshop: {
    status: () => request('/dailyshop'),
    buy: (itemKey) => request('/dailyshop/buy', { method: 'POST', body: { itemKey } }),
  },

  pets: {
    list: () => request('/pets'),
    equip: (petKey) => request('/pets/equip', { method: 'POST', body: { petKey } }),
  },

  worlds: {
    list: () => request('/worlds'),
    advance: () => request('/worlds/advance', { method: 'POST' }),
  },

  profile: {
    get: (telegramId) => request(`/profile/${telegramId}`),
  },

  comboboard: {
    list: () => request('/comboboard'),
  },

  guildwars: {
    status: () => request('/guildwars'),
  },

  tournament: {
    status: () => request('/tournament'),
  },

  prestigeshop: {
    status: () => request('/prestigeshop'),
    buy: (upgradeKey) => request('/prestigeshop/buy', { method: 'POST', body: { upgradeKey } }),
  },

  bossrush: {
    status: () => request('/bossrush'),
    start: () => request('/bossrush/start', { method: 'POST' }),
    tap: (count) => request('/bossrush/tap', { method: 'POST', body: { count } }),
    abandon: () => request('/bossrush/abandon', { method: 'POST' }),
  },

  inventory: {
    list: () => request('/inventory'),
    use: (itemKey) => request('/inventory/use', { method: 'POST', body: { itemKey } }),
  },

  stats: {
    get: () => request('/stats'),
  },

  friends: {
    list: () => request('/friends'),
    profile: (telegramId) => request(`/friends/${telegramId}`),
    add: (friendId) => request('/friends/add', { method: 'POST', body: { friendId } }),
    accept: (friendId) => request('/friends/accept', { method: 'POST', body: { friendId } }),
    remove: (friendId) => request('/friends/remove', { method: 'POST', body: { friendId } }),
  },

  taprush: {
    status: () => request('/taprush'),
    start:  () => request('/taprush/start', { method: 'POST' }),
  },

  worldboss: {
    status: () => request('/worldboss'),
    tap:    (count) => request('/worldboss/tap', { method: 'POST', body: { count } }),
  },

  guildraid: {
    status: () => request('/guildraid'),
    start:  () => request('/guildraid/start', { method: 'POST' }),
    tap:    (count) => request('/guildraid/tap', { method: 'POST', body: { count } }),
  },

  wardrobe: {
    status: () => request('/wardrobe'),
    equip:  (skinKey) => request('/wardrobe/equip', { method: 'POST', body: { skinKey } }),
  },

  challenges: {
    list:  () => request('/challenges'),
    claim: (challengeKey) => request('/challenges/claim', { method: 'POST', body: { challengeKey } }),
  },

  crafting: {
    list:  () => request('/crafting'),
    craft: (recipeKey) => request('/crafting/craft', { method: 'POST', body: { recipeKey } }),
  },

  season: {
    status: () => request('/season'),
  },

  referralboard: {
    status: () => request('/referralboard'),
  },

  abilities: {
    status:   () => request('/abilities'),
    activate: (abilityKey) => request('/abilities/activate', { method: 'POST', body: { abilityKey } }),
  },

  ascension: {
    status:    () => request('/ascension'),
    ascend:    () => request('/ascension/ascend', { method: 'POST' }),
    upgrade:   (upgradeKey) => request('/ascension/upgrade', { method: 'POST', body: { upgradeKey } }),
    leaderboard: () => request('/ascension/leaderboard'),
  },

  artifacts: {
    list:    () => request('/artifacts'),
    equip:   (artifactId) => request('/artifacts/equip', { method: 'POST', body: { artifactId } }),
    unequip: (slot) => request('/artifacts/unequip', { method: 'POST', body: { slot } }),
    combine: (artifactKey, rarity) => request('/artifacts/combine', { method: 'POST', body: { artifactKey, rarity } }),
  },

  rankedduels: {
    me:         () => request('/rankedduels/me'),
    find:       () => request('/rankedduels/find', { method: 'POST' }),
    tap:        (count) => request('/rankedduels/tap', { method: 'POST', body: { count } }),
    settle:     (id) => request(`/rankedduels/settle/${id}`, { method: 'POST' }),
    leaderboard: () => request('/rankedduels/leaderboard'),
  },

  mastery: {
    list: () => request('/mastery'),
  },

  clanbracket: {
    status:   () => request('/clanbracket'),
    register: () => request('/clanbracket/register', { method: 'POST' }),
    start:    () => request('/clanbracket/start', { method: 'POST' }),
    tap:      (count) => request('/clanbracket/tap', { method: 'POST', body: { count } }),
    settle:   (matchId) => request(`/clanbracket/settle-match/${matchId}`, { method: 'POST' }),
  },

  tapchallenge: {
    list:        () => request('/tapchallenge'),
    start:       (challengeKey) => request('/tapchallenge/start', { method: 'POST', body: { challengeKey } }),
    tap:         (count) => request('/tapchallenge/tap', { method: 'POST', body: { count } }),
    abandon:     () => request('/tapchallenge/abandon', { method: 'POST' }),
    leaderboard: (key) => request(`/tapchallenge/leaderboard/${key}`),
  },

  seasonnarrative: {
    status: () => request('/seasonnarrative'),
  },

  guildskilltree: {
    status:     () => request('/guildskilltree'),
    contribute: (count) => request('/guildskilltree/contribute', { method: 'POST', body: { count } }),
    upgrade:    (skillKey) => request('/guildskilltree/upgrade', { method: 'POST', body: { skillKey } }),
  },

  worldevents: {
    list: () => request('/worldevents'),
  },

  buildpresets: {
    list:   () => request('/buildpresets'),
    save:   (slot, name) => request('/buildpresets/save', { method: 'POST', body: { slot, name } }),
    delete: (slot) => request('/buildpresets/delete', { method: 'POST', body: { slot } }),
  },

  bossecosystem: {
    list: () => request('/bossecosystem'),
    tap:  (key, count) => request(`/bossecosystem/tap/${key}`, { method: 'POST', body: { count } }),
  },

  ghostrace: {
    get:  (key) => request(`/ghostrace/${key}`),
    save: (challengeKey, totalTaps, timeline) => request('/ghostrace/save', { method: 'POST', body: { challengeKey, totalTaps, timeline } }),
  },

  questboard: {
    status: () => request('/questboard'),
    claim:  (questKey, periodKey) => request('/questboard/claim', { method: 'POST', body: { questKey, periodKey } }),
    chest:  () => request('/questboard/chest', { method: 'POST' }),
  },

  coopraid: {
    list:   () => request('/coopraid'),
    create: (bossKey) => request('/coopraid/create', { method: 'POST', body: { bossKey } }),
    join:   (lobbyId) => request('/coopraid/join',   { method: 'POST', body: { lobbyId } }),
    start:  (lobbyId) => request('/coopraid/start',  { method: 'POST', body: { lobbyId } }),
    tap:    (lobbyId, count) => request('/coopraid/tap', { method: 'POST', body: { lobbyId, count } }),
    leave:  (lobbyId) => request('/coopraid/leave',  { method: 'POST', body: { lobbyId } }),
  },

  relics: {
    list:     () => request('/relics'),
    grant:    (relicKey) => request('/relics/grant',    { method: 'POST', body: { relicKey } }),
    equip:    (relicKey) => request('/relics/equip',    { method: 'POST', body: { relicKey } }),
    unequip:  () => request('/relics/unequip',          { method: 'POST' }),
    activate: (relicKey) => request('/relics/activate', { method: 'POST', body: { relicKey } }),
  },

  divisionleague: {
    status: () => request('/divisionleague'),
  },

  gallery: {
    list:  () => request('/gallery'),
    claim: (achKey) => request('/gallery/claim', { method: 'POST', body: { achKey } }),
  },

  rhythmtap: {
    status: () => request('/rhythmtap'),
    submit: (score, perfect, good, miss) => request('/rhythmtap/submit', { method: 'POST', body: { score, perfect, good, miss } }),
  },

  shadowrival: {
    status:    () => request('/shadowrival'),
    challenge: (myScore) => request('/shadowrival/challenge', { method: 'POST', body: { myScore } }),
    upgrades:  () => request('/shadowrival/upgrades'),
    upgrade:   (upgradeKey) => request('/shadowrival/upgrade', { method: 'POST', body: { upgradeKey } }),
  },

  territories: {
    list: () => request('/territories'),
    tap:  (territoryId, count) => request('/territories/tap', { method: 'POST', body: { territoryId, count } }),
  },

  alchemy: {
    status:  () => request('/alchemy'),
    brew:    (recipeKey) => request('/alchemy/brew', { method: 'POST', body: { recipeKey } }),
    collect: (taps, combos, prestige) => request('/alchemy/collect', { method: 'POST', body: { taps, combos, prestige } }),
  },

  campaign: {
    status:  () => request('/campaign'),
    start:   () => request('/campaign/start',   { method: 'POST' }),
    tap:     (count) => request('/campaign/tap', { method: 'POST', body: { count } }),
    abandon: () => request('/campaign/abandon', { method: 'POST' }),
  },

  globalboss: {
    status: () => request('/globalboss'),
    tap:    (count) => request('/globalboss/tap', { method: 'POST', body: { count } }),
  },

  gauntlet: {
    status: () => request('/gauntlet'),
    submit: (waves, totalDamage) => request('/gauntlet/submit', { method: 'POST', body: { waves, totalDamage } }),
  },

  cardfusion: {
    status:  () => request('/cardfusion'),
    fuse:    (cardKey, slot) => request('/cardfusion/fuse',    { method: 'POST', body: { cardKey, slot } }),
    destroy: (slot) =>         request('/cardfusion/destroy',  { method: 'POST', body: { slot } }),
  },

  guildforge: {
    status:     () => request('/guildforge'),
    forge:      (recipeKey) => request('/guildforge/forge',      { method: 'POST', body: { recipeKey } }),
    contribute: (amount)    => request('/guildforge/contribute', { method: 'POST', body: { amount } }),
  },

  oracle: {
    status:   () => request('/oracle'),
    request:  () => request('/oracle/request', { method: 'POST' }),
    claim:    () => request('/oracle/claim',   { method: 'POST' }),
    buy:      (itemKey) => request('/oracle/buy', { method: 'POST', body: { itemKey } }),
  },

  championship: {
    status:       () => request('/championship'),
    matchResult:  (matchId, taps) => request('/championship/match-result', { method: 'POST', body: { matchId, taps } }),
  },

  neuraltree: {
    status: () => request('/neuraltree'),
    unlock: (nodeId) => request('/neuraltree/unlock', { method: 'POST', body: { nodeId } }),
  },
};
