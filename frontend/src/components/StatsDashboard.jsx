import { useState, useEffect } from 'react';
import { api } from '../api';

export default function StatsDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.stats.get().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const { days, totals } = data;
  const maxTaps = Math.max(1, ...days.map(d => d.taps));

  return (
    <div className="stats-section">
      <div className="stats-header">📊 My Stats</div>

      <div className="stats-grid">
        <div className="stat-chip">
          <div className="stat-chip-val">{totals.totalTaps.toLocaleString()}</div>
          <div className="stat-chip-lbl">Total Taps</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">{totals.totalBp.toLocaleString()}</div>
          <div className="stat-chip-lbl">Total BP</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">✨{totals.prestige}</div>
          <div className="stat-chip-lbl">Prestige</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">🔥{totals.maxStreak}d</div>
          <div className="stat-chip-lbl">Best Streak</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">×{totals.maxCombo.toFixed(1)}</div>
          <div className="stat-chip-lbl">Best Combo</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-val">Zone {totals.currentZone}</div>
          <div className="stat-chip-lbl">World Zone</div>
        </div>
      </div>

      <div className="stats-chart-header">Taps — last 7 days</div>
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
