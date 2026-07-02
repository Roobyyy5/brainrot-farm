import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const MILESTONE_LEVELS = [10, 25, 50, 75, 100];

export default function MasteryPanel() {
  const t = useT();
  const [data, setData] = useState(null);

  useEffect(() => { api.mastery.list().then(setData).catch(() => {}); }, []);

  if (!data) return null;

  return (
    <div className="mastery-panel">
      <div className="mastery-header">{t('mastery_header')}</div>
      <div className="mastery-sub">{t('mastery_buy')}</div>
      <div className="mastery-list">
        {(data.upgrades || []).map(u => {
          const pct = u.masteryLevel / u.masteryMax * 100;
          return (
            <div key={u.key} className="mastery-item">
              <div className="mastery-item-header">
                <span className="mastery-icon">{u.icon}</span>
                <span className="mastery-label">{u.label}</span>
                <span className="mastery-level">{t('mastery_lv', { n: u.masteryLevel })}</span>
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
                {u.masteryLevel >= u.masteryMax
                  ? t('mastery_mastered')
                  : t('mastery_xp_next', { cur: u.masteryXp % 50 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
