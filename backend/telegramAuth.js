const crypto = require('crypto');

// Validates Telegram WebApp initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  // Reject stale initData so a captured/leaked payload can't be replayed
  // indefinitely. Telegram regenerates initData each time the Mini App opens.
  const authDate = parseInt(params.get('auth_date'), 10);
  const MAX_AGE_SECONDS = 24 * 60 * 60;
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) return null;

  const userJson = params.get('user');
  if (!userJson) return null;
  return JSON.parse(userJson);
}

// Express middleware: reads `initData` from header `x-telegram-init-data`,
// verifies it, and attaches the Telegram user to req.tgUser.
function telegramAuthMiddleware(req, res, next) {
  if (process.env.SKIP_TELEGRAM_AUTH === 'true') {
    // Local dev fallback: trust a plain telegram_id/username sent in the body/query.
    req.tgUser = {
      id: req.body.telegram_id || req.query.telegram_id,
      username: req.body.username || req.query.username || 'dev_user',
    };
    if (!req.tgUser.id) return res.status(401).json({ error: 'telegram_id required in dev mode' });
    return next();
  }

  const initData = req.headers['x-telegram-init-data'];
  if (!initData) return res.status(401).json({ error: 'Missing Telegram initData' });

  const user = verifyInitData(initData, process.env.BOT_TOKEN);
  if (!user) return res.status(401).json({ error: 'Invalid Telegram initData' });

  req.tgUser = { id: String(user.id), username: user.username || user.first_name || 'player' };
  next();
}

module.exports = { telegramAuthMiddleware, verifyInitData };
