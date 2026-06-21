import { useState } from 'react';
import { api } from '../api';
import FloatingReward from './FloatingReward';

export default function DailyReward({ onClaimed }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [floatId, setFloatId] = useState(0);
  const [floatReward, setFloatReward] = useState(null);

  const handleClaim = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.daily();
      setMessage(`Daily claimed: +${data.reward} (streak: ${data.streak})`);
      setFloatReward(data.reward);
      setFloatId((id) => id + 1);
      onClaimed(data.user);
    } catch (err) {
      if (err.status === 429) {
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
        <button className="daily-button" onClick={handleClaim} disabled={loading}>
          🎁 Claim Daily Reward
        </button>
        <FloatingReward key={floatId} reward={floatReward} />
      </div>
      {message && <div className="daily-message">{message}</div>}
    </div>
  );
}
