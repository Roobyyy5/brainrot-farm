import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function ChallengeBoard() {
  const t = useT();
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
      if (r.reward?.gems) parts.push(t('cb_reward_gems', { n: r.reward.gems }));
      if (r.reward?.bp)   parts.push(t('cb_reward_bp',   { n: r.reward.bp }));
      alert(t('cb_claimed') + parts.join(', '));
      load();
    } catch (err) { alert(err.message); }
    finally { setClaiming(null); }
  };

  if (!data) return null;

  return (
    <div className="challenges-section">
      <div className="challenges-header">{t('cb_header')}</div>

      <div className="challenges-group-title">{t('cb_daily')}</div>
      {data.daily.map(c => (
        <div key={c.key} className={`challenge-row${c.claimed ? ' challenge-row--done' : ''}`}>
          <span className="challenge-icon">{c.icon}</span>
          <div className="challenge-info">
            <div className="challenge-label">{t('cb_label_' + c.key)}</div>
            <div className="challenge-reward">
              {c.reward.gems && t('cb_reward_gems', { n: c.reward.gems })}
              {c.reward.bp && t('cb_reward_bp', { n: c.reward.bp })}
            </div>
          </div>
          {c.claimed ? (
            <div className="challenge-claimed">✓</div>
          ) : (
            <button className="challenge-claim-btn" onClick={() => handleClaim(c.key)} disabled={claiming === c.key}>
              {claiming === c.key ? '...' : t('cb_claim')}
            </button>
          )}
        </div>
      ))}

      <div className="challenges-group-title">{t('cb_weekly')}</div>
      {data.weekly.map(c => (
        <div key={c.key} className={`challenge-row${c.claimed ? ' challenge-row--done' : ''}`}>
          <span className="challenge-icon">{c.icon}</span>
          <div className="challenge-info">
            <div className="challenge-label">{t('cb_label_' + c.key)}</div>
            <div className="challenge-reward">
              {c.reward.gems && t('cb_reward_gems', { n: c.reward.gems })}
              {c.reward.bp && t('cb_reward_bp', { n: c.reward.bp })}
            </div>
          </div>
          {c.claimed ? (
            <div className="challenge-claimed">✓</div>
          ) : (
            <button className="challenge-claim-btn" onClick={() => handleClaim(c.key)} disabled={claiming === c.key}>
              {claiming === c.key ? '...' : t('cb_claim')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
