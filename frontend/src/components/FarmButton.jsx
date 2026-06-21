import { useEffect, useState } from 'react';
import { api } from '../api';
import FloatingReward from './FloatingReward';

const BOOST_COST = 25; // keep in sync with backend gameConfig.BOOST_COST

function formatMs(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FarmButton({ user, onFarmed }) {
  const [cooldownMs, setCooldownMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [message, setMessage] = useState('');
  const [floatId, setFloatId] = useState(0);
  const [floatReward, setFloatReward] = useState(null);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const interval = setInterval(() => {
      setCooldownMs((prev) => Math.max(prev - 1000, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownMs]);

  const handleFarm = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.farm();
      setMessage(`+${data.reward} brainrot points!`);
      setFloatReward(data.reward);
      setFloatId((id) => id + 1);
      onFarmed(data.user);
    } catch (err) {
      if (err.status === 429) {
        setCooldownMs(err.data.retryAfterMs);
        setMessage('Braincells still recharging...');
      } else {
        setMessage(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBoost = async () => {
    setBoosting(true);
    setMessage('');
    try {
      const data = await api.boost();
      setCooldownMs(0);
      setMessage('Boosted! Farm is ready again.');
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
          {cooldownMs > 0 ? `Recharging ${formatMs(cooldownMs)}` : '🧠 Farm Braincells'}
        </button>
        <FloatingReward key={floatId} reward={floatReward} />
      </div>
      {cooldownMs > 0 && (
        <button className="boost-button" onClick={handleBoost} disabled={!canBoost || boosting}>
          ⚡ Boost for {BOOST_COST} pts
        </button>
      )}
      {message && <div className="farm-message">{message}</div>}
    </div>
  );
}
