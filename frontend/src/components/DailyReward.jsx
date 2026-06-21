import { useState } from 'react';
import { api } from '../api';

export default function DailyReward({ onClaimed }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.daily();
      setMessage(`Daily claimed: +${data.reward} (streak: ${data.streak})`);
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
      <button className="daily-button" onClick={handleClaim} disabled={loading}>
        🎁 Claim Daily Reward
      </button>
      {message && <div className="daily-message">{message}</div>}
    </div>
  );
}
