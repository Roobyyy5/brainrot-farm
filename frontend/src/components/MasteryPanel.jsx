import { useState, useEffect } from 'react';
import { api } from '../api';

const MILESTONE_LEVELS = [10, 25, 50, 75, 100];

export default function MasteryPanel() {
  const [data, setData] = useState(null);

  useEffect(() => { api.mastery.list().then(setData).catch(() => {}); }, []);

  if (!data) return null;

  return (
    <div className="mastery-panel">
      <div className="mastery-header">⚗️ Upgrade Mastery</div>
      <div className="mastery-sub">Buy upgrades to earn Mastery XP → permanent bonus %</div>
      <div className="mastery-list">
        {(data.upgrades || []).map(u => {
          const pct = u.masteryLevel / u.masteryMax * 100;
          return (
            <div key={u.key} className="mastery-item">
              <div className="mastery-item-header">
                <span className="mastery-icon">{u.icon}</span>
                <span className="mastery-label">{u.label}</span>
                <span className="mastery-level">Lv {u.masteryLevel}</span>
                {u.bonusPct > 0 && <span className="mastery-bonus">+{u.bonusPct}%</span>}
              </div>
              <div className="mastery-bar-wrap">
                <div className="mastery-bar" style={{ width: `${pct}%` }} />
                {MILESTONE_LEVELS.map(ml => (
                  <div
                    key={ml}
                    className={`mastery-milestone ${u.masteryLevel >= ml ? 'achieved' : ''}`}
                    style={{ left: `${ml}%` }}
                    title={`Level ${ml}: +${u.milestones?.[ml]?.value || 0}%`}
                  />
                ))}
              </div>
              <div className="mastery-xp-text">
                {u.masteryLevel >= u.masteryMax ? '✅ MASTERED' : `${u.masteryXp % 50}/${50} XP to next level`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
