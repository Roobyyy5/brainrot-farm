import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function ComboLeaderboard() {
  const t = useT();
  const [entries, setEntries] = useState([]);
  const [myBest, setMyBest] = useState(null);

  useEffect(() => {
    api.comboboard.list().then(d => {
      setEntries(d.entries);
      setMyBest(d.myBest);
    }).catch(() => {});
  }, []);

  return (
    <div className="comboboard-section">
      <div className="comboboard-header">{t('combo_lb_title')}</div>
      <div className="comboboard-sub">{t('combo_best')}</div>
      {myBest && (
        <div className="comboboard-mybest">{t('combo_my_best', { n: myBest.toFixed(1) })}</div>
      )}
      <div className="comboboard-list">
        {entries.length === 0 && (
          <div className="comboboard-empty">{t('combo_no_combos')}</div>
        )}
        {entries.map(e => (
          <div key={e.telegramId} className={`comboboard-row${e.isMe ? ' comboboard-row--me' : ''}`}>
            <span className="comboboard-rank">#{e.rank}</span>
            <span className="comboboard-name">{e.username}</span>
            <span className="comboboard-combo">×{e.maxCombo.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
