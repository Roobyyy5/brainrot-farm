import { useState, useEffect } from 'react';
import { api } from '../api';

export default function TapperMissions({ onEarned }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  const load = () => api.missions.list().then((d) => setMissions(d.missions)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleClaim = async (key, reward) => {
    if (claiming) return;
    setClaiming(key);
    try {
      await api.missions.claim(key);
      onEarned?.(reward);
      load();
    } catch (err) {
      alert(err.message || 'Cannot claim');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return <div className="tap-loading">Loading missions...</div>;

  return (
    <div className="missions-section">
      <h3 className="missions-title">📋 Daily Missions</h3>
      <div className="missions-list">
        {missions.map((m) => {
          const pct = Math.min(100, (m.progress / m.target) * 100);
          return (
            <div
              key={m.key}
              className={`mission-row${m.claimed ? ' mission-row--done' : m.completed ? ' mission-row--ready' : ''}`}
            >
              <span className="mission-emoji">{m.emoji}</span>
              <div className="mission-info">
                <div className="mission-name">{m.name}</div>
                <div className="mission-progress-wrap">
                  <div className="mission-bar-track">
                    <div className="mission-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="mission-progress-label">
                    {m.progress.toLocaleString()} / {m.target.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mission-right">
                <span className="mission-reward">+{m.reward}</span>
                {m.claimed ? (
                  <span className="mission-done">✓</span>
                ) : m.completed ? (
                  <button
                    className="mission-claim-btn"
                    onClick={() => handleClaim(m.key, m.reward)}
                    disabled={claiming === m.key}
                  >
                    {claiming === m.key ? '...' : 'Claim'}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
