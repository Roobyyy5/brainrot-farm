import { useEffect, useState } from 'react';
import { api } from '../api';
import { haptic } from '../telegram';
import { useT } from '../context/LangContext';
import FloatingReward from './FloatingReward';

const BOOST_COST = 25;
const FARM_COOLDOWN_MS = 5 * 60 * 1000;

function formatMs(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FarmButton({ user, onFarmed, onAchievements }) {
  const t = useT();
  const [cooldownMs, setCooldownMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [message, setMessage] = useState('');
  const [floatId, setFloatId] = useState(0);
  const [floatReward, setFloatReward] = useState(null);

  useEffect(() => {
    if (!user?.last_farm_at) return;
    const remaining = FARM_COOLDOWN_MS - (Date.now() - user.last_farm_at);
    if (remaining > 0) setCooldownMs(remaining);
  }, [user?.telegram_id]);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const interval = setInterval(() => {
      setCooldownMs((prev) => Math.max(prev - 1000, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownMs]);

  const handleFarm = async () => {
    haptic('medium');
    setLoading(true);
    setMessage('');
    try {
      const data = await api.farm();
      setMessage(t('farm_earned', { n: data.reward }));
      setFloatReward(data.reward);
      setFloatId((id) => id + 1);
      setCooldownMs(FARM_COOLDOWN_MS);
      onFarmed(data.user);
      if (data.unlockedAchievements?.length) onAchievements?.(data.unlockedAchievements);
    } catch (err) {
      if (err.status === 429) {
        setCooldownMs(err.data.retryAfterMs);
        setMessage(t('farm_cooldown'));
      } else {
        setMessage(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBoost = async () => {
    haptic('light');
    setBoosting(true);
    setMessage('');
    try {
      const data = await api.boost();
      setCooldownMs(0);
      setMessage(t('farm_boosted'));
      onFarmed(data.user);
    } catch (err) {
      setMessage(err.data?.error || err.message);
    } finally {
      setBoosting(false);
    }
  };

  const disabled = loading || cooldownMs > 0;
  const canBoost = cooldownMs > 0 && user && user.coins >= BOOST_COST;

  return (
    <div className="farm-section">
      <div className="farm-button-wrap">
        <button className="farm-button" onClick={handleFarm} disabled={disabled}>
          {cooldownMs > 0 ? t('farm_recharging', { time: formatMs(cooldownMs) }) : t('farm_btn')}
        </button>
        <FloatingReward key={floatId} reward={floatReward} />
      </div>
      {cooldownMs > 0 && (
        <button className="boost-button" onClick={handleBoost} disabled={!canBoost || boosting}>
          {t('farm_boost_btn', { n: BOOST_COST })}
        </button>
      )}
      {message && <div className="farm-message">{message}</div>}
    </div>
  );
}
