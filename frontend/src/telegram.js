export function getTelegram() {
  return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
}

export function getInitData() {
  const tg = getTelegram();
  return tg ? tg.initData : '';
}

export function getTelegramUser() {
  const tg = getTelegram();
  return tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
}

export function getStartParam() {
  const tg = getTelegram();
  const fromMiniApp = tg && tg.initDataUnsafe ? tg.initDataUnsafe.start_param : null;
  if (fromMiniApp) return fromMiniApp;
  // Fallback: bot.js appends ?ref=<code> when a user reaches the Mini App
  // via a classic /start deep link instead of a direct ?startapp= link.
  return new URLSearchParams(window.location.search).get('ref');
}

export function initTelegram() {
  const tg = getTelegram();
  if (tg) {
    tg.ready();
    tg.expand();
  }
}

export function haptic(style = 'light') {
  const tg = getTelegram();
  tg?.HapticFeedback?.impactOccurred(style);
}

export function shareLink(url, text) {
  const tg = getTelegram();
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  if (tg) {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
}
