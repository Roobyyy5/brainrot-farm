import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ReferralLeaderboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.referralboard.status().then(setData).catch(() => {}); }, []);

  if (!data || !data.leaderboard?.length) return null;

  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="refboard-section">
      <div className="refboard-header">👥 Referral Leaderboard</div>
      <div className="refboard-meta">{month} · Top referrers earn gems at month end</div>

      {data.myRefCount > 0 && (
        <div className="refboard-mine">
          <span>Your referrals: <b>{data.myRefCount}</b></span>
          {data.myRank && <span>Rank: <b>#{data.myRank}</b></span>}
          {data.prizes[data.myRank - 1] && <span>Prize: 💎{data.prizes[data.myRank - 1]}</span>}
        </div>
      )}

      <table className="refboard-table">
        <thead>
          <tr><th>#</th><th>Player</th><th>Referrals</th><th>Gems</th></tr>
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
