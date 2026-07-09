require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const db = require('./db');
const { telegramAuthMiddleware } = require('./telegramAuth');
const registerRoute = require('./routes/register');
const farmRoute = require('./routes/farm');
const dailyRoute = require('./routes/daily');
const boostRoute = require('./routes/boost');
const leaderboardRoute = require('./routes/leaderboard');
const referralRoute = require('./routes/referral');
const adminRoute = require('./routes/admin');
const achievementsRoute = require('./routes/achievements');
const tapperRoute = require('./routes/tapper');
const cardsRoute = require('./routes/cards');
const wheelRoute = require('./routes/wheel');
const missionsRoute = require('./routes/missions');
const gemshopRoute = require('./routes/gemshop');
const skillsRoute = require('./routes/skills');
const battlepassRoute = require('./routes/battlepass');
const loginstreakRoute = require('./routes/loginstreak');
const guildsRoute = require('./routes/guilds');
const duelsRoute = require('./routes/duels');
const { router: dailyshopRoute } = require('./routes/dailyshop');
const petsRoute       = require('./routes/pets');
const worldsRoute     = require('./routes/worlds');
const profileRoute    = require('./routes/profile');
const comboboardRoute = require('./routes/comboboard');
const { router: guildwarsRoute } = require('./routes/guildwars');
const { router: tournamentRoute, settleTournament } = require('./routes/tournament');
const prestigeshopRoute = require('./routes/prestigeshop');
const bossrushRoute     = require('./routes/bossrush');
const { router: inventoryRoute } = require('./routes/inventory');
const statsRoute        = require('./routes/stats');
const friendsRoute      = require('./routes/friends');
const tapRushRoute      = require('./routes/taprush');
const { router: worldBossRoute, settleExpiredBosses } = require('./routes/worldboss');
const guildRaidRoute    = require('./routes/guildraid');
const wardrobeRoute     = require('./routes/wardrobe');
const challengesRoute   = require('./routes/challenges');
const craftingRoute     = require('./routes/crafting');
const { router: seasonRoute, settleSeason } = require('./routes/season');
const referralBoardRoute = require('./routes/referralboard');
const abilitiesRoute     = require('./routes/abilities');
const ascensionRoute     = require('./routes/ascension');
const { router: artifactsRoute } = require('./routes/artifacts');
const rankedDuelsRoute   = require('./routes/rankedduels');
const { router: masteryRoute }  = require('./routes/mastery');
const clanBracketRoute   = require('./routes/clanbracket');
const tapChallengeRoute  = require('./routes/tapchallenge');
const seasonNarrativeRoute = require('./routes/seasonnarrative');
const guildSkillTreeRoute  = require('./routes/guildskilltree');
const { router: worldEventsRoute, spawnRandomEvent } = require('./routes/worldevents');
const buildPresetsRoute    = require('./routes/buildpresets');
const { router: bossEcoRoute, initBossEcosystem } = require('./routes/bossecosystem');
const ghostRaceRoute       = require('./routes/ghostrace');
const { router: questBoardRoute } = require('./routes/questboard');
const coopRaidRoute        = require('./routes/coopraid');
const { router: relicsRoute } = require('./routes/relics');
const { router: divisionRoute, settleDivisions } = require('./routes/divisionleague');
const galleryRoute         = require('./routes/gallery');
const rhythmTapRoute       = require('./routes/rhythmtap');
const shadowRivalRoute     = require('./routes/shadowrival');
const territoriesRoute     = require('./routes/territories');
const { router: alchemyRoute } = require('./routes/alchemy');
const campaignRoute        = require('./routes/campaign');
const { router: globalBossRoute, spawnGlobalBoss } = require('./routes/globalboss');
const gauntletRoute      = require('./routes/gauntlet');
const cardFusionRoute    = require('./routes/cardfusion');
const guildForgeRoute    = require('./routes/guildforge');
const { router: oracleRoute } = require('./routes/oracle');
const { router: championshipRoute, seedBracket } = require('./routes/championship');
const { router: neuralTreeRoute } = require('./routes/neuraltree');
const weatherRoute        = require('./routes/weather');
const { router: mentorRoute } = require('./routes/mentor');
const auctionRoute        = require('./routes/auction');
const constellationRoute  = require('./routes/constellation');
const tapStreakCalRoute    = require('./routes/tapstreakcal');
const olympicsRoute       = require('./routes/olympics');

const app = express();
const httpServer = http.createServer(app);

// Restrict CORS to the Mini App origin only
const allowedOrigin = process.env.MINI_APP_URL ? new URL(process.env.MINI_APP_URL).origin : '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '64kb' }));

// Security headers — prevent the API from being framed or sniffed as a web page
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Anti-cheat: server-side cooldowns are the main defense, this is a backstop
// against scripted abuse hammering the API faster than any human could.
// Keyed by Telegram user id (set by telegramAuthMiddleware, which always
// runs first) rather than IP — Mini App traffic is frequently NAT-shared
// across many real users on the same mobile carrier, so per-IP limiting
// would punish unrelated people sharing a network.
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.tgUser?.id || ipKeyGenerator(req.ip),
});

const botStatus = { configured: false, started: false, error: null };

app.get('/health', (req, res) => res.json({ ok: true, uptime: Math.floor(process.uptime()), ts: Date.now() }));
app.get('/bot-status', (req, res) => res.json(botStatus));

app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — Figabrain</title>
<style>body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.7}h1{font-size:1.6rem}h2{font-size:1.1rem;margin-top:2rem}a{color:#8b5cf6}</style>
</head><body>
<h1>Privacy Policy</h1>
<p><strong>Last updated: ${new Date().toISOString().slice(0,10)}</strong></p>
<p>Figabrain ("the Game") is a Telegram Mini App. This policy describes what data we collect and how we use it.</p>

<h2>Data We Collect</h2>
<ul>
  <li><strong>Telegram user data</strong>: user ID, first name, username — provided by Telegram when you open the app.</li>
  <li><strong>Gameplay data</strong>: tap counts, coins, gems, progress, achievements, guild membership.</li>
  <li><strong>Language preference</strong>: stored to deliver the app in your language.</li>
  <li><strong>Referral data</strong>: if you join via a referral link, the referrer's ID is stored.</li>
</ul>

<h2>How We Use Your Data</h2>
<ul>
  <li>To run the game and synchronise your progress across sessions.</li>
  <li>To display leaderboards (username and score only).</li>
  <li>To send optional in-app Telegram notifications (reminders, events). You can stop them via /stop in the bot.</li>
</ul>

<h2>Data Sharing</h2>
<p>We do not sell or share your data with third parties. Your Telegram user ID and username may be visible to other players on public leaderboards.</p>

<h2>Data Retention</h2>
<p>Your data is kept for as long as you play. You may request deletion by contacting us via Telegram.</p>

<h2>Contact</h2>
<p>Questions? Message us on Telegram: <a href="https://t.me/${process.env.BOT_USERNAME || 'figabrain_bot'}">${process.env.BOT_USERNAME || 'figabrain_bot'}</a></p>
</body></html>`);
});

app.use('/leaderboard', leaderboardRoute); // public, no auth
app.use('/admin', adminRoute); // protected by its own x-admin-key check

app.use('/register', telegramAuthMiddleware, actionLimiter, registerRoute);
app.use('/farm', telegramAuthMiddleware, actionLimiter, farmRoute);
app.use('/daily', telegramAuthMiddleware, actionLimiter, dailyRoute);
app.use('/boost', telegramAuthMiddleware, actionLimiter, boostRoute);
app.use('/referral', telegramAuthMiddleware, actionLimiter, referralRoute);
app.use('/achievements', telegramAuthMiddleware, actionLimiter, achievementsRoute);

// Tapper needs a higher rate limit — batches fire ~once per second from the client
const tapperLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.tgUser?.id || ipKeyGenerator(req.ip),
});
app.use('/tapper', telegramAuthMiddleware, tapperLimiter, tapperRoute);
app.use('/cards', telegramAuthMiddleware, actionLimiter, cardsRoute);
app.use('/wheel', telegramAuthMiddleware, actionLimiter, wheelRoute);
app.use('/missions', telegramAuthMiddleware, actionLimiter, missionsRoute);
app.use('/gemshop',     telegramAuthMiddleware, actionLimiter, gemshopRoute);
app.use('/skills',     telegramAuthMiddleware, actionLimiter, skillsRoute);
app.use('/battlepass', telegramAuthMiddleware, actionLimiter, battlepassRoute);
app.use('/loginstreak',telegramAuthMiddleware, actionLimiter, loginstreakRoute);
app.use('/guilds',     telegramAuthMiddleware, actionLimiter, guildsRoute);
app.use('/duels',      telegramAuthMiddleware, actionLimiter, duelsRoute);
app.use('/dailyshop',  telegramAuthMiddleware, actionLimiter, dailyshopRoute);
app.use('/pets',       telegramAuthMiddleware, actionLimiter, petsRoute);
app.use('/worlds',     telegramAuthMiddleware, actionLimiter, worldsRoute);
app.use('/profile',    telegramAuthMiddleware, actionLimiter, profileRoute);
app.use('/comboboard', telegramAuthMiddleware, actionLimiter, comboboardRoute);
app.use('/guildwars',  telegramAuthMiddleware, actionLimiter, guildwarsRoute);
app.use('/tournament', telegramAuthMiddleware, actionLimiter, tournamentRoute);
app.use('/prestigeshop', telegramAuthMiddleware, actionLimiter, prestigeshopRoute);
app.use('/bossrush',   telegramAuthMiddleware, tapperLimiter, bossrushRoute);
app.use('/inventory',  telegramAuthMiddleware, actionLimiter, inventoryRoute);
app.use('/stats',        telegramAuthMiddleware, actionLimiter, statsRoute);
app.use('/friends',      telegramAuthMiddleware, actionLimiter, friendsRoute);
app.use('/taprush',      telegramAuthMiddleware, tapperLimiter, tapRushRoute);
app.use('/worldboss',    telegramAuthMiddleware, tapperLimiter, worldBossRoute);
app.use('/guildraid',    telegramAuthMiddleware, tapperLimiter, guildRaidRoute);
app.use('/wardrobe',     telegramAuthMiddleware, actionLimiter, wardrobeRoute);
app.use('/challenges',   telegramAuthMiddleware, actionLimiter, challengesRoute);
app.use('/crafting',     telegramAuthMiddleware, actionLimiter, craftingRoute);
app.use('/season',       telegramAuthMiddleware, actionLimiter, seasonRoute);
app.use('/referralboard',telegramAuthMiddleware, actionLimiter, referralBoardRoute);
app.use('/abilities',       telegramAuthMiddleware, actionLimiter, abilitiesRoute);
app.use('/ascension',       telegramAuthMiddleware, actionLimiter, ascensionRoute);
app.use('/artifacts',       telegramAuthMiddleware, actionLimiter, artifactsRoute);
app.use('/rankedduels',     telegramAuthMiddleware, tapperLimiter, rankedDuelsRoute);
app.use('/mastery',         telegramAuthMiddleware, actionLimiter, masteryRoute);
app.use('/clanbracket',     telegramAuthMiddleware, tapperLimiter, clanBracketRoute);
app.use('/tapchallenge',    telegramAuthMiddleware, tapperLimiter, tapChallengeRoute);
app.use('/seasonnarrative', telegramAuthMiddleware, actionLimiter, seasonNarrativeRoute);
app.use('/guildskilltree',  telegramAuthMiddleware, actionLimiter, guildSkillTreeRoute);
app.use('/worldevents',     telegramAuthMiddleware, actionLimiter, worldEventsRoute);
app.use('/buildpresets',    telegramAuthMiddleware, actionLimiter, buildPresetsRoute);
app.use('/bossecosystem',   telegramAuthMiddleware, tapperLimiter, bossEcoRoute);
app.use('/ghostrace',       telegramAuthMiddleware, actionLimiter, ghostRaceRoute);
app.use('/questboard',      telegramAuthMiddleware, actionLimiter, questBoardRoute);
app.use('/coopraid',        telegramAuthMiddleware, tapperLimiter, coopRaidRoute);
app.use('/relics',          telegramAuthMiddleware, actionLimiter, relicsRoute);
app.use('/divisionleague',  telegramAuthMiddleware, actionLimiter, divisionRoute);
app.use('/gallery',         telegramAuthMiddleware, actionLimiter, galleryRoute);
app.use('/rhythmtap',       telegramAuthMiddleware, tapperLimiter, rhythmTapRoute);
app.use('/shadowrival',     telegramAuthMiddleware, actionLimiter, shadowRivalRoute);
app.use('/territories',     telegramAuthMiddleware, tapperLimiter, territoriesRoute);
app.use('/alchemy',         telegramAuthMiddleware, actionLimiter, alchemyRoute);
app.use('/campaign',        telegramAuthMiddleware, tapperLimiter, campaignRoute);
app.use('/globalboss',      telegramAuthMiddleware, tapperLimiter, globalBossRoute);
app.use('/gauntlet',        telegramAuthMiddleware, tapperLimiter, gauntletRoute);
app.use('/cardfusion',      telegramAuthMiddleware, actionLimiter, cardFusionRoute);
app.use('/guildforge',      telegramAuthMiddleware, actionLimiter, guildForgeRoute);
app.use('/oracle',          telegramAuthMiddleware, actionLimiter, oracleRoute);
app.use('/championship',    telegramAuthMiddleware, actionLimiter, championshipRoute);
app.use('/neuraltree',      telegramAuthMiddleware, actionLimiter, neuralTreeRoute);
app.use('/weather',         telegramAuthMiddleware, actionLimiter, weatherRoute);
app.use('/mentor',          telegramAuthMiddleware, actionLimiter, mentorRoute);
app.use('/auction',         telegramAuthMiddleware, actionLimiter, auctionRoute);
app.use('/constellation',   telegramAuthMiddleware, actionLimiter, constellationRoute);
app.use('/tapstreakcal',    telegramAuthMiddleware, actionLimiter, tapStreakCalRoute);
app.use('/olympics',        telegramAuthMiddleware, actionLimiter, olympicsRoute);

// Telegram alert to admin on critical server errors (requires ADMIN_CHAT_ID env var)
let _alertCooldown = 0;
function alertAdmin(text) {
  const chatId = process.env.ADMIN_CHAT_ID;
  const token  = process.env.BOT_TOKEN;
  if (!chatId || !token) return;
  const now = Date.now();
  if (now - _alertCooldown < 60_000) return; // max 1 alert per minute
  _alertCooldown = now;
  const msg = encodeURIComponent(`🚨 Figabrain server error:\n${String(text).slice(0, 500)}`);
  require('https').get(
    `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${msg}`,
    (r) => r.resume()
  ).on('error', () => {});
}

// Global error handler — every route is wrapped in asyncHandler so thrown
// errors land here instead of becoming an unhandled rejection that would
// crash the whole process for every connected user.
app.use((err, req, res, next) => {
  console.error('Request error:', err);
  if (err.status !== 400 && err.status !== 403 && err.status !== 404) alertAdmin(err.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  await db.init();

  // Attach WebSocket server to HTTP server (Layer 7)
  const { attachToServer } = require('./wsManager');
  attachToServer(httpServer);

  const { startSeasonScheduler } = require('./seasons');
  startSeasonScheduler();
  setInterval(() => settleTournament().catch(err => console.error('Tournament settle error:', err.message)), 5 * 60 * 1000);
  setInterval(() => settleExpiredBosses().catch(err => console.error('World boss settle error:', err.message)), 10 * 60 * 1000);
  setInterval(() => settleSeason().catch(err => console.error('Season settle error:', err.message)), 60 * 60 * 1000);
  setInterval(() => spawnRandomEvent().catch(err => console.error('World event spawn error:', err.message)), 60 * 60 * 1000);
  setInterval(() => settleDivisions().catch(err => console.error('Division settle error:', err.message)), 24 * 60 * 60 * 1000);
  setInterval(() => spawnGlobalBoss().catch(err => console.error('Global boss spawn error:', err.message)), 60 * 60 * 1000);
  setInterval(() => seedBracket().catch(err => console.error('Championship bracket error:', err.message)), 60 * 60 * 1000);

  // Init boss ecosystem on startup
  const { pool: dbPool } = require('./db');
  const initClient = await dbPool.connect();
  try { await initBossEcosystem(initClient); } finally { initClient.release(); }

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Brainrot Farm backend running on http://localhost:${PORT} (WebSocket on /ws)`);
  });

  // Keep-alive: ping own /health every 10 min so Render free tier never sleeps.
  // RENDER_EXTERNAL_URL is set automatically by Render on all services.
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (selfUrl) {
    setInterval(() => {
      require('https').get(`${selfUrl}/health`, (r) => r.resume()).on('error', () => {});
    }, 10 * 60 * 1000);
    console.log('Keep-alive ping enabled →', selfUrl);
  }

  // On free hosting tiers (e.g. Render) only a single Web Service is free —
  // background workers are a paid add-on. Running the bot's long-polling loop
  // inside the same process keeps the whole stack on one free service.
  if (process.env.BOT_TOKEN && process.env.MINI_APP_URL) {
    botStatus.configured = true;
    const { startBot } = require('./bot');
    startBot()
      .then((bot) => {
        botStatus.started = true;
        const { startReminders } = require('./reminders');
        startReminders(bot);
      })
      .catch((err) => {
        botStatus.error = err.message;
        console.error('Failed to start bot:', err);
      });
  } else {
    botStatus.error = 'BOT_TOKEN/MINI_APP_URL not set';
    console.log('BOT_TOKEN/MINI_APP_URL not set — skipping in-process bot startup.');
  }
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

// Last-resort net for errors outside the request lifecycle (background
// reminder/season checks, fire-and-forget event logging). Node >=15 crashes
// the process on an unhandled rejection by default — log instead so a
// transient DB blip doesn't take the whole service down.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  alertAdmin(`Unhandled rejection: ${err?.message || err}`);
});
