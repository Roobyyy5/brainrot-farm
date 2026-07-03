import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function SeasonLeaderboard() {
  const t = useT();
  const [data, setData] = useState(null);

  useEffect(() => { api.season.status().then(setData).catch(() => {}); }, []);

  if (!data) return null;

  const countdown = () => {
    const ms = Math.max(0, data.endsAt - Date.now());
    const d  = Math.floor(ms / 86400000);
    const h  = Math.floor((ms % 86400000) / 3600000);
    return `${d}${t('time_d')} ${h}${t('time_h')}`;
  };

  return (
    <div className="season-section">
      <div className="season-header">{t('season_lb_header', { n: data.seasonNum })}</div>
      <div className="season-meta">{t('season_ends', { time: countdown() })}</div>

      {data.myRank && (
        <div className="season-my-rank">
          <span>{t('season_your_rank', { n: data.myRank })}</span>
          <span>{t('season_your_bp', { n: data.mySeasonBp.toLocaleString() })}</span>
          {data.prizes[data.myRank - 1] && <span>{t('season_prize', { n: data.prizes[data.myRank - 1] })}</span>}
        </div>
      )}

      <table className="season-table">
        <thead>
          <tr>
            <th>{t('season_col_rank')}</th>
            <th>{t('season_col_player')}</th>
            <th>{t('season_col_bp')}</th>
            <th>{t('season_col_prize')}</th>
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
          <div className="season-trophies-title">{t('season_past_trophies')}</div>
          {data.trophies.map((tr, i) => (
            <div key={i} className="season-trophy-row">
              <span>{tr.trophy_icon}</span>
              <span>{t('season_trophy_row', { n: tr.season_num, rank: tr.rank })}</span>
              <span>{Number(tr.bpEarned).toLocaleString()} BP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
