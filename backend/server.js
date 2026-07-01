require('dotenv').config();
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

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/bot-status', (req, res) => res.json(botStatus));

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
app.use('/gemshop', telegramAuthMiddleware, actionLimiter, gemshopRoute);

// Global error handler — every route is wrapped in asyncHandler so thrown
// errors land here instead of becoming an unhandled rejection that would
// crash the whole process for every connected user.
app.use((err, req, res, next) => {
  console.error('Request error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  await db.init();

  const { startSeasonScheduler } = require('./seasons');
  startSeasonScheduler();

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Brainrot Farm backend running on http://localhost:${PORT}`);
  });

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
});
