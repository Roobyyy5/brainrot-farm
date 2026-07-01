import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ChallengeBoard() {
  const [data, setData] = useState(null);
  const [claiming, setClaiming] = useState(null);

  const load = () => api.challenges.list().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleClaim = async (key) => {
    if (claiming) return;
    setClaiming(key);
    try {
      const r = await api.challenges.claim(key);
      const parts = [];
      if (r.reward?.gems) parts.push(`💎 +${r.reward.gems} gems`);
      if (r.reward?.bp)   parts.push(`💰 +${r.reward.bp} BP`);
      alert('Claimed! ' + parts.join(', '));
      load();
    } catch (err) { alert(err.message); }
    finally { setClaiming(null); }
  };

  if (!data) return null;

  return (
    <div className="challenges-section">
      <div className="challenges-header">📋 Challenge Board</div>

      <div className="challenges-group-title">📅 Daily Challenges</div>
      {data.daily.map(c => (
        <div key={c.key} className={`challenge-row${c.claimed ? ' challenge-row--done' : ''}`}>
          <span className="challenge-icon">{c.icon}</span>
          <div className="challenge-info">
            <div className="challenge-label">{c.label}</div>
            <div className="challenge-reward">
              {c.reward.gems && `💎 ${c.reward.gems} gems`}
              {c.reward.bp && `💰 ${c.reward.bp} BP`}
            </div>
          </div>
          {c.claimed ? (
            <div className="challenge-claimed">✓</div>
          ) : (
            <button className="challenge-claim-btn" onClick={() => handleClaim(c.key)} disabled={claiming === c.key}>
              {claiming === c.key ? '...' : 'Claim'}
            </button>
          )}
        </div>
      ))}

      <div className="challenges-group-title">📆 Weekly Challenges</div>
      {data.weekly.map(c => (
        <div key={c.key} className={`challenge-row${c.claimed ? ' challenge-row--done' : ''}`}>
          <span className="challenge-icon">{c.icon}</span>
          <div className="challenge-info">
            <div className="challenge-label">{c.label}</div>
            <div className="challenge-reward">
              {c.reward.gems && `💎 ${c.reward.gems} gems`}
              {c.reward.bp && `💰 ${c.reward.bp} BP`}
            </div>
          </div>
          {c.claimed ? (
            <div className="challenge-claimed">✓</div>
          ) : (
            <button className="challenge-claim-btn" onClick={() => handleClaim(c.key)} disabled={claiming === c.key}>
              {claiming === c.key ? '...' : 'Claim'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
