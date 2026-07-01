import { useState, useEffect } from 'react';
import { api } from '../api';

const WEEKLY_PRIZES = [100, 75, 50, 30, 25, 25, 20, 20, 15, 15];

export default function TapLeaderboard({ currentUserId }) {
  const [tapData, setTapData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [tab, setTab] = useState('allTime');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.tapper.leaderboard(),
      api.leaderboard('weekly'),
    ]).then(([tap, weekly]) => {
      setTapData(tap);
      setWeeklyData(weekly);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="tap-loading">Loading leaderboard...</div>;

  const isWeekly = tab === 'weekly';
  const isTapTab = tab === 'allTime' || tab === 'today';

  let rows = [];
  if (tab === 'allTime') rows = tapData?.allTime || [];
  if (tab === 'today')   rows = tapData?.daily || [];
  if (tab === 'weekly')  rows = weeklyData || [];

  return (
    <div className="tap-lb-section">
      <div className="tap-lb-header">
        <span className="tap-lb-title">🏆 Leaderboard</span>
        <div className="leaderboard-tabs">
          <button className={`leaderboard-tab${tab === 'allTime' ? ' active' : ''}`} onClick={() => setTab('allTime')}>
            All-Time
          </button>
          <button className={`leaderboard-tab${tab === 'today' ? ' active' : ''}`} onClick={() => setTab('today')}>
            Today
          </button>
          <button className={`leaderboard-tab${tab === 'weekly' ? ' active' : ''}`} onClick={() => setTab('weekly')}>
            League
          </button>
        </div>
      </div>

      {tab === 'weekly' && (
        <div className="weekly-prizes-row">
          {WEEKLY_PRIZES.slice(0, 3).map((gems, i) => (
            <div key={i} className="weekly-prize-chip">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} 💎{gems}
            </div>
          ))}
          <div className="weekly-prize-chip" style={{ opacity: 0.7 }}>4–10: 💎15–30</div>
          <div className="weekly-reset-hint">Resets weekly · Earn gems!</div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="tap-lb-empty">No data yet. Start {tab === 'weekly' ? 'earning BP!' : 'tapping!'}</div>
      ) : (
        <ul className="leaderboard-list">
          {rows.map((r, idx) => {
            const rank = r.rank ?? (idx + 1);
            const isMe = r.telegram_id === currentUserId;
            const score = tab === 'allTime' ? r.total_taps
              : tab === 'today' ? r.taps_today
              : r.weekly_coins;
            const unit = tab === 'weekly' ? ' BP' : ' taps';
            return (
              <li key={r.telegram_id} className={`leaderboard-row${isMe ? ' me' : ''}`}>
                <span className="leaderboard-rank">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                </span>
                <span className="leaderboard-name">
                  {r.username || `User ${String(r.telegram_id).slice(-4)}`}
                </span>
                <span className="leaderboard-level-badge">{r.level}</span>
                <span className="leaderboard-coins">
                  {(score || 0).toLocaleString()}{unit}
                  {tab === 'weekly' && WEEKLY_PRIZES[idx] && (
                    <span className="weekly-gem-prize"> 💎{WEEKLY_PRIZES[idx]}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
