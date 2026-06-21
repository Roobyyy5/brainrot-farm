import { useEffect, useState } from 'react';
import { api } from '../api';
import FloatingReward from './FloatingReward';

function formatMs(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FarmButton({ onFarmed }) {
  const [cooldownMs, setCooldownMs] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const disabled = loading || cooldownMs > 0;

  return (
    <div className="farm-section">
      <div className="farm-button-wrap">
        <button className="farm-button" onClick={handleFarm} disabled={disabled}>
          {cooldownMs > 0 ? `Recharging ${formatMs(cooldownMs)}` : '🧠 Farm Braincells'}
        </button>
        <FloatingReward key={floatId} reward={floatReward} />
      </div>
      {message && <div className="farm-message">{message}</div>}
    </div>
  );
}
