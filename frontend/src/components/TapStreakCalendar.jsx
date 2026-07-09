import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

export default function TapStreakCalendar() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.tapstreakcal.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const claim = async (day) => {
    setLoading(true);
    try {
      const r = await api.tapstreakcal.claim(day);
      toastSuccess(`+${r.reward.gems} 💎${r.reward.title ? ` + "${r.reward.title}"` : ''}`);
      await load();
    } catch (err) { toastError(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const { streak, claimedDays, calendar } = data;

  return (
    <div className="tscal-panel">
      <div className="tscal-header">{t('tscal_header')}</div>
      <div className="tscal-streak-row">
        <span className="tscal-streak-num">{streak}</span>
        <span className="tscal-streak-label">{t('tscal_day_streak')}</span>
        <span className="tscal-best">{t('tscal_best', { n: data.longestStreak })}</span>
      </div>

      <div className="tscal-grid">
        {calendar.map(dayDef => {
          const claimed = claimedDays.includes(dayDef.day);
          const reachable = dayDef.day <= streak;
          const claimable = reachable && !claimed;

          return (
            <div
              key={dayDef.day}
              className={`tscal-day ${claimed ? 'claimed' : reachable ? 'reachable' : 'locked'} ${dayDef.special ? 'special' : ''}`}
              onClick={claimable ? () => claim(dayDef.day) : undefined}
            >
              <div className="tscal-day-num">{dayDef.day}</div>
              <div className="tscal-day-reward">
                {claimed ? '✅' : dayDef.special ? `💎${dayDef.reward.gems}` : `+${dayDef.reward.gems}`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="tscal-legend">
        <span className="tscal-leg claimed-dot">{t('tscal_leg_claimed')}</span>
        <span className="tscal-leg reachable-dot">{t('tscal_leg_reachable')}</span>
        <span className="tscal-leg special-dot">{t('tscal_leg_special')}</span>
      </div>

      <div className="tscal-hint">{t('tscal_hint')}</div>
    </div>
  );
}
