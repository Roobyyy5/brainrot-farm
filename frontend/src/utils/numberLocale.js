// Force a single, consistent locale for every Number#toLocaleString() call
// across the app.
//
// Why: the codebase calls `value.toLocaleString()` in ~50 places with no
// locale argument, so each call fell back to the *user's* OS/browser locale.
// That made the same value render as "188,309" for some users and "188 309"
// for others — and inconsistently between components on the same screen.
//
// This patch sets a canonical default locale while still honoring any call
// that passes an explicit locale/options. Imported once, before the app
// mounts (see main.jsx).
//
// Change APP_NUMBER_LOCALE to 'en-US' if you prefer commas as the separator.
export const APP_NUMBER_LOCALE = 'uk-UA'; // non-breaking space as thousands separator

const _toLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (locales, options) {
  return _toLocaleString.call(this, locales ?? APP_NUMBER_LOCALE, options);
};

// Optional helper for new code that wants explicit, safe integer formatting.
const _intFormatter = new Intl.NumberFormat(APP_NUMBER_LOCALE, { maximumFractionDigits: 0 });
export function fmtNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? _intFormatter.format(n) : '0';
}
