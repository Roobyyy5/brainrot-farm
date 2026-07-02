import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function ReferralLeaderboard() {
  const t = useT();
  const [data, setData] = useState(null);

  useEffect(() => { api.referralboard.status().then(setData).catch(() => {}); }, []);

  if (!data || !data.leaderboard?.length) return null;

  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="refboard-section">
      <div className="refboard-header">👥 {t('ref_lb_title')}</div>
      <div className="refboard-meta">{month} · {t('ref_lb_meta')}</div>

      {data.myRefCount > 0 && (
        <div className="refboard-mine">
          <span>{t('ref_lb_your', { n: data.myRefCount })}</span>
          {data.myRank && <span>{t('ref_lb_rank', { n: data.myRank })}</span>}
          {data.prizes[data.myRank - 1] && <span>{t('ref_lb_prize', { n: data.prizes[data.myRank - 1] })}</span>}
        </div>
      )}

      <table className="refboard-table">
        <thead>
          <tr>
            <th>{t('ref_lb_col_rank')}</th>
            <th>{t('ref_lb_col_player')}</th>
            <th>{t('ref_lb_col_refs')}</th>
            <th>{t('ref_lb_col_gems')}</th>
          </tr>
        </thead>
        <tbody>
          {data.leaderboard.map(r => (
            <tr key={r.rank}>
              <td>{r.rank}</td>
              <td>{r.username}</td>
              <td>{r.refCount}</td>
              <td>{r.prizeGems > 0 ? `💎${r.prizeGems}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
