import { useState, useEffect } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useT } from '../context/LangContext';

const TIER_COLOR = {
  Iron: '#9ca3af', Bronze: '#cd7f32', Silver: '#c0c5ce',
  Gold: '#f5c344', Platinum: '#00e5ff', Diamond: '#ff4fa3',
};

export default function DivisionLeague() {
  const t = useT();
  const [data, setData] = useState(null);

  const load = () => api.divisionleague.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  useWebSocket({
    rooms: data ? [`division:${data.me?.divisionId}`] : [],
    onMessage: (msg) => {
      if (msg.type === 'division_score') load();
    },
  });

  if (!data) return null;

  const { me, division, tierDef, tiers, timeUntilEndMs } = data;
  const color = TIER_COLOR[me.tier] || '#888';
  const daysLeft = Math.floor(timeUntilEndMs / 86400000);
  const hoursLeft = Math.floor((timeUntilEndMs % 86400000) / 3600000);

  return (
    <div className="divleague-panel">
      <div className="divleague-header">{t('div_header')}</div>

      <div className="divleague-my-tier" style={{ borderColor: color }}>
        <span className="divleague-tier-icon">{tierDef?.icon}</span>
        <div className="divleague-tier-info">
          <div className="divleague-tier-name" style={{ color }}>{me.tier} Division</div>
          <div className="divleague-tier-sub">{t('div_tier_sub', { rank: me.rank, total: division.length, score: me.tapScore.toLocaleString() })}</div>
        </div>
        <div className="divleague-timer">
          <div className="divleague-timer-label">{t('div_resets')}</div>
          <div className="divleague-timer-val">{daysLeft}d {hoursLeft}h</div>
        </div>
      </div>

      <div className="divleague-rules">
        <span className="divleague-rule promote">⬆ {t('div_promote', { n: tierDef?.promote })}</span>
        <span className="divleague-reward">💎 {tierDef?.gemReward} gems</span>
        {tierDef?.relegate > 0 && <span className="divleague-rule relegate">{t('div_relegate', { n: tierDef?.relegate })}</span>}
      </div>

      <div className="divleague-table">
        {division.map(r => (
          <div key={r.rank} className={`divleague-row ${r.isMe ? 'me' : ''} ${r.rank <= tierDef?.promote ? 'promote-zone' : ''}`}>
            <span className="divleague-rank">
              {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
            </span>
            <span className="divleague-name">{r.username}{r.isMe ? ' ⭐' : ''}</span>
            <span className="divleague-score">{r.tapScore.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
