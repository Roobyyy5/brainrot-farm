import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function StatsDashboard() {
  const t = useT();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.stats.get().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const { days, totals } = data;
  const maxTaps = Math.max(1, ...days.map(d => d.taps));

  return (
    <div className="stats-section">
      <div className="stats-header">📊 {t('stats_title')}</div>

      <div className="stats-grid">
        <div className="stat-chip">
          <div className="stat-chip-val">{totals.totalTaps.toLocaleString()}</div>
          <div className="stat-chip-lbl">{t('stats_total_taps')}</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">{totals.totalBp.toLocaleString()}</div>
          <div className="stat-chip-lbl">{t('stats_total_bp')}</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">✨{totals.prestige}</div>
          <div className="stat-chip-lbl">{t('stats_prestige')}</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">🔥{totals.maxStreak}d</div>
          <div className="stat-chip-lbl">{t('stats_best_streak')}</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">×{totals.maxCombo.toFixed(1)}</div>
          <div className="stat-chip-lbl">{t('stats_best_combo')}</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">{t('stats_zone_prefix')} {totals.currentZone}</div>
          <div className="stat-chip-lbl">{t('stats_zone')}</div>
        </div>
      </div>

      <div className="stats-chart-header">{t('stats_taps_week')}</div>
      <div className="stats-bar-chart">
        {days.map(d => (
          <div key={d.date} className="stats-bar-col">
            <div className="stats-bar-fill-wrap">
              <div
                className="stats-bar-fill"
                style={{ height: `${(d.taps / maxTaps) * 100}%` }}
              />
            </div>
            <div className="stats-bar-label">{d.date.slice(5)}</div>
            {d.taps > 0 && <div className="stats-bar-val">{d.taps >= 1000 ? `${(d.taps/1000).toFixed(1)}k` : d.taps}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
