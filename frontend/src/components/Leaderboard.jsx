import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Leaderboard({ currentUserId }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.leaderboard().then((data) => setRows(data.leaderboard)).catch(() => {});
  }, []);

  return (
    <div className="leaderboard-section">
      <div className="leaderboard-title">🏆 Top Gigachads</div>
      <ol className="leaderboard-list">
        {rows.map((row, i) => (
          <li
            key={row.telegram_id}
            className={row.telegram_id === currentUserId ? 'leaderboard-row me' : 'leaderboard-row'}
          >
            <span className="leaderboard-rank">#{i + 1}</span>
            <span className="leaderboard-name">{row.username || 'anon'}</span>
            <span className="leaderboard-level">{row.level}</span>
            <span className="leaderboard-coins">{row.coins.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
