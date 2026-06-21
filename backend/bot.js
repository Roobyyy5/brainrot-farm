const { Bot, InlineKeyboard } = require('grammy');

async function startBot() {
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is missing in .env');
  }
  if (!process.env.MINI_APP_URL) {
    throw new Error('MINI_APP_URL is missing in .env');
  }
  if (!process.env.MINI_APP_URL.startsWith('https://')) {
    throw new Error(`MINI_APP_URL must start with https:// (got "${process.env.MINI_APP_URL}") — Telegram rejects non-HTTPS web_app buttons`);
  }

  const bot = new Bot(process.env.BOT_TOKEN);

  bot.command('start', async (ctx) => {
    // If the user reached the bot via a deep link (t.me/Bot?start=<code>),
    // grammY exposes the payload in ctx.match. We forward it as a query param
    // so the Mini App can still pick up a referral code if it wasn't opened
    // through the dedicated `?startapp=` link.
    const refPayload = ctx.match;
    const appUrl = refPayload ? `${process.env.MINI_APP_URL}?ref=${encodeURIComponent(refPayload)}` : process.env.MINI_APP_URL;

    const keyboard = new InlineKeyboard().webApp('🧠 Open Brainrot Farm', appUrl);

    // Awaiting (rather than fire-and-forget) means a rejection — e.g. Telegram
    // rejecting a non-HTTPS web_app URL — surfaces through bot.catch() instead
    // of becoming an unhandled rejection that crashes the whole process.
    await ctx.reply(
      'Welcome to Brainrot Farm! Farm braincells, climb from NPC to Gigachad, and invite friends for bonus points.',
      { reply_markup: keyboard }
    );
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  // bot.init() resolves once the token has been validated against the
  // Telegram API, so a bad token surfaces here instead of failing silently
  // inside the fire-and-forget polling loop started by bot.start().
  await bot.init();
  bot.start().catch((err) => console.error('Bot polling crashed:', err));
  console.log(`Brainrot Farm bot @${bot.botInfo.username} is polling for updates...`);
  return bot;
}

if (require.main === module) {
  require('dotenv').config();
  startBot().catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });
}

module.exports = { startBot };
