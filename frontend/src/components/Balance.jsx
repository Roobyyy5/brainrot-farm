const LEVELS = [
  { name: 'NPC', minCoins: 0, emoji: '🗿' },
  { name: 'Sigma', minCoins: 1000, emoji: '😎' },
  { name: 'Gigachad', minCoins: 10000, emoji: '💪' },
  { name: 'Ohio Rizzler', minCoins: 50000, emoji: '🚿' },
  { name: 'Skibidi Legend', minCoins: 200000, emoji: '🐐' },
];

function getLevelProgress(coins) {
  // Plain loop instead of Array.prototype.findLastIndex (ES2023) — some
  // older Android system WebViews used inside Telegram don't support it yet.
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (coins >= LEVELS[i].minCoins) idx = i;
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1];
  if (!next) return { current, next: null, pct: 100 };
  const span = next.minCoins - current.minCoins;
  const pct = Math.min(100, Math.round(((coins - current.minCoins) / span) * 100));
  return { current, next, pct };
}

export default function Balance({ user }) {
  if (!user) return null;
  const { current, next, pct } = getLevelProgress(user.coins);

  return (
    <div className="balance-card">
      <div className="balance-label">Brainrot Points</div>
      <div className="balance-value">{user.coins.toLocaleString()}</div>
      <div className="balance-level">
        <span className="balance-level-emoji">{current.emoji}</span> {current.name}
      </div>
      {next && (
        <div className="balance-progress">
          <div className="balance-progress-track">
            <div className="balance-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="balance-progress-label">
            {next.emoji} {next.minCoins - user.coins > 0 ? next.minCoins - user.coins : 0} to {next.name}
          </div>
        </div>
      )}
    </div>
  );
}
