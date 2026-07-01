import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SeasonLeaderboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.season.status().then(setData).catch(() => {}); }, []);

  if (!data) return null;

  const countdown = () => {
    const ms = Math.max(0, data.endsAt - Date.now());
    const d  = Math.floor(ms / 86400000);
    const h  = Math.floor((ms % 86400000) / 3600000);
    return `${d}d ${h}h`;
  };

  return (
    <div className="season-section">
      <div className="season-header">🏅 Season {data.seasonNum} Leaderboard</div>
      <div className="season-meta">Season ends in {countdown()}</div>

      {data.myRank && (
        <div className="season-my-rank">
          <span>Your rank: <b>#{data.myRank}</b></span>
          <span>Season BP: <b>{data.mySeasonBp.toLocaleString()}</b></span>
          {data.prizes[data.myRank - 1] && <span>Prize: 💎{data.prizes[data.myRank - 1]}</span>}
        </div>
      )}

      <table className="season-table">
        <thead>
          <tr>
            <th>#</th><th>Player</th><th>Season BP</th><th>Prize</th>
          </tr>
        </thead>
        <tbody>
          {data.topPlayers.map(p => (
            <tr key={p.rank}>
              <td className="season-rank">
                {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}
              </td>
              <td>{p.username}</td>
              <td>{p.seasonBp.toLocaleString()}</td>
              <td>{data.prizes[p.rank - 1] ? `💎${data.prizes[p.rank - 1]}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.trophies?.length > 0 && (
        <div className="season-trophies">
          <div className="season-trophies-title">Your Past Trophies</div>
          {data.trophies.map((t, i) => (
            <div key={i} className="season-trophy-row">
              <span>{t.trophy_icon}</span>
              <span>Season {t.season_num} — Rank #{t.rank}</span>
              <span>{Number(t.bpEarned).toLocaleString()} BP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
