import { useEffect, useState } from 'react';
import { api } from '../api';
import { haptic } from '../telegram';
import FloatingReward from './FloatingReward';

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // keep in sync with backend gameConfig.DAILY_COOLDOWN_MS

function formatRemaining(ms) {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export default function DailyReward({ user, onClaimed, onAchievements }) {
  const [cooldownMs, setCooldownMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [floatId, setFloatId] = useState(0);
  const [floatReward, setFloatReward] = useState(null);

  useEffect(() => {
    if (!user?.last_daily_at) return;
    const remaining = DAILY_COOLDOWN_MS - (Date.now() - user.last_daily_at);
    if (remaining > 0) setCooldownMs(remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.telegram_id]);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const interval = setInterval(() => {
      setCooldownMs((prev) => Math.max(prev - 30000, 0));
    }, 30000);
    return () => clearInterval(interval);
  }, [cooldownMs]);

  const handleClaim = async () => {
    haptic('medium');
    setLoading(true);
    setMessage('');
    try {
      const data = await api.daily();
      setMessage(`Daily claimed: +${data.reward} (streak: ${data.streak})`);
      setFloatReward(data.reward);
      setFloatId((id) => id + 1);
      setCooldownMs(DAILY_COOLDOWN_MS);
      onClaimed(data.user);
      if (data.unlockedAchievements?.length) onAchievements?.(data.unlockedAchievements);
    } catch (err) {
      if (err.status === 429) {
        setCooldownMs(err.data.retryAfterMs);
        setMessage('Already claimed today. Come back later, Sigma.');
      } else {
        setMessage(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="daily-section">
      <div className="farm-button-wrap">
        <button className="daily-button" onClick={handleClaim} disabled={loading || cooldownMs > 0}>
          {cooldownMs > 0 ? `🎁 Claimed — back in ${formatRemaining(cooldownMs)}` : '🎁 Claim Daily Reward'}
        </button>
        <FloatingReward key={floatId} reward={floatReward} />
      </div>
      {message && <div className="daily-message">{message}</div>}
    </div>
  );
}
