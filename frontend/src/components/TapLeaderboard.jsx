import { useState, useEffect } from 'react';
import { api } from '../api';

export default function TapLeaderboard({ currentUserId }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('allTime');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tapper.leaderboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="tap-loading">Loading leaderboard...</div>;
  if (!data) return null;

  const rows = tab === 'allTime' ? data.allTime : data.daily;

  return (
    <div className="tap-lb-section">
      <div className="tap-lb-header">
        <span className="tap-lb-title">🏆 Tap Leaderboard</span>
        <div className="leaderboard-tabs">
          <button
            className={`leaderboard-tab${tab === 'allTime' ? ' active' : ''}`}
            onClick={() => setTab('allTime')}
          >
            All-Time
          </button>
          <button
            className={`leaderboard-tab${tab === 'daily' ? ' active' : ''}`}
            onClick={() => setTab('daily')}
          >
            Today
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="tap-lb-empty">No data yet. Start tapping!</div>
      ) : (
        <ul className="leaderboard-list">
          {rows.map((r) => (
            <li
              key={r.telegram_id}
              className={`leaderboard-row${r.telegram_id === currentUserId ? ' me' : ''}`}
            >
              <span className="leaderboard-rank">
                {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
              </span>
              <span className="leaderboard-name">
                {r.username || `User ${r.telegram_id?.slice(-4)}`}
              </span>
              <span className="leaderboard-level-badge">{r.level}</span>
              <span className="leaderboard-coins">
                {tab === 'allTime'
                  ? (r.total_taps?.toLocaleString() || 0)
                  : (r.taps_today?.toLocaleString() || 0)}
                {' '}taps
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
