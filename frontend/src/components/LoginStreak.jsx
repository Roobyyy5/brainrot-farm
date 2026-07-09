import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

const REWARD_ICON = { coins: '💰', gems: '💎', energy_refill: '⚡' };

export default function LoginStreak({ onEarned, onGemsChanged }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const load = () => api.loginstreak.status().then(setData);
  useEffect(() => { load(); }, []);

  const handleClaim = async () => {
    if (claiming || !data?.canClaim) return;
    setClaiming(true);
    try {
      const res = await api.loginstreak.claim();
      if (res.reward.type === 'coins') onEarned?.(res.reward.amount);
      if (res.reward.type === 'gems') onGemsChanged?.(res.reward.amount);
      load();
    } catch (err) { toastError(err.message || t('upgrade_err')); }
    finally { setClaiming(false); }
  };

  if (!data) return null;

  return (
    <div className="login-streak-section">
      <div className="login-streak-header">
        <span className="login-streak-title">{t('ls_title')}</span>
        <span className="login-streak-count">{t('ls_streak', { n: data.streak })}</span>
      </div>
      <div className="login-streak-rewards">
        {data.allRewards.map((r, i) => {
          const dayNum = (data.streak % data.allRewards.length);
          const isCurrent = i === dayNum && data.canClaim;
          const isPast = i < dayNum || (!data.canClaim && i <= dayNum);
          return (
            <div key={i} className={`ls-day${isCurrent ? ' ls-day--current' : ''}${isPast ? ' ls-day--done' : ''}`}>
              <div className="ls-day-icon">{REWARD_ICON[r.type] || '🎁'}</div>
              <div className="ls-day-label">
                {r.amount ? r.amount : r.type === 'energy_refill' ? t('ls_full') : '?'}
              </div>
              <div className="ls-day-num">{t('ls_day', { n: i + 1 })}</div>
            </div>
          );
        })}
      </div>
      <button
        className="ls-claim-btn"
        onClick={handleClaim}
        disabled={!data.canClaim || claiming}
      >
        {claiming ? '...' : data.canClaim
          ? t('ls_claim', { n: (data.streak % data.allRewards.length) + 1 })
          : t('ls_claimed')}
      </button>
    </div>
  );
}
