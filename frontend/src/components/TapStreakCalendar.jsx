import { useState, useEffect } from 'react';
import { api } from '../api';

export default function TapStreakCalendar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.tapstreakcal.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const claim = async (day) => {
    setLoading(true);
    try {
      const r = await api.tapstreakcal.claim(day);
      alert(`+${r.reward.gems} 💎${r.reward.title ? ` + "${r.reward.title}"` : ''}`);
      await load();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const { streak, claimedDays, calendar } = data;

  return (
    <div className="tscal-panel">
      <div className="tscal-header">🔥 Streak Calendar</div>
      <div className="tscal-streak-row">
        <span className="tscal-streak-num">{streak}</span>
        <span className="tscal-streak-label">day streak</span>
        <span className="tscal-best">🏆 Best: {data.longestStreak}</span>
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
        <span className="tscal-leg claimed-dot">✅ Забрано</span>
        <span className="tscal-leg reachable-dot">🟢 Доступно</span>
        <span className="tscal-leg special-dot">⭐ Особлива</span>
      </div>

      <div className="tscal-hint">Заходь щодня щоб підтримувати streak! Пропустив — streak скидається.</div>
    </div>
  );
}
