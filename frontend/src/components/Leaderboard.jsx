import { useEffect, useState } from 'react';
import { api } from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];
const LEVEL_EMOJI = { NPC: '🗿', Sigma: '😎', Gigachad: '💪', 'Ohio Rizzler': '🚿', 'Skibidi Legend': '🐐' };

export default function Leaderboard({ currentUserId }) {
  const [period, setPeriod] = useState('all-time');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.leaderboard(period).then((data) => setRows(data.leaderboard)).catch(() => {});
  }, [period]);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="leaderboard-section">
      <div className="leaderboard-header">
        <div className="leaderboard-title">Leaderboard</div>
        <div className="leaderboard-tabs">
          <button
            className={period === 'all-time' ? 'leaderboard-tab active' : 'leaderboard-tab'}
            onClick={() => setPeriod('all-time')}
          >
            All-time
          </button>
          <button
            className={period === 'weekly' ? 'leaderboard-tab active' : 'leaderboard-tab'}
            onClick={() => setPeriod('weekly')}
          >
            This week
          </button>
        </div>
      </div>

      {top3.length > 0 && (
        <div className="leaderboard-podium">
          {top3.map((row, i) => (
            <div key={row.telegram_id} className={`podium-slot rank-${i + 1}`}>
              <span className="podium-medal">{MEDALS[i]}</span>
              <span className="podium-name">{row.username || 'anon'}</span>
              <span className="podium-score">{row.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <ol className="leaderboard-list">
        {rest.map((row, i) => (
          <li
            key={row.telegram_id}
            className={row.telegram_id === currentUserId ? 'leaderboard-row me' : 'leaderboard-row'}
          >
            <span className="leaderboard-rank">#{i + 4}</span>
            <span className="leaderboard-name">{row.username || 'anon'}</span>
            <span className="leaderboard-level-badge">{LEVEL_EMOJI[row.level] || ''} {row.level}</span>
            <span className="leaderboard-coins">{row.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
