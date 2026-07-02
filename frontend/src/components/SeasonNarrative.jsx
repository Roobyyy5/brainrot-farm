import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const THEME_GRADIENT = {
  origin:   'linear-gradient(135deg, #6366f1, #8b5cf6)',
  chaos:    'linear-gradient(135deg, #ef4444, #f97316)',
  prestige: 'linear-gradient(135deg, #f59e0b, #eab308)',
  endgame:  'linear-gradient(135deg, #6b7280, #1f2937)',
};

export default function SeasonNarrative() {
  const t = useT();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { api.seasonnarrative.status().then(setData).catch(() => {}); }, []);

  if (!data) return null;
  const { current, next, mySeasonBP, seasonNum, topPlayers } = data;
  const gradient = THEME_GRADIENT[current.theme] || THEME_GRADIENT.origin;

  return (
    <div className="season-narrative" style={{ background: gradient }}>
      <div className="sn-top" onClick={() => setExpanded(e => !e)}>
        <span className="sn-icon">{current.icon}</span>
        <div className="sn-main">
          <div className="sn-season">{t('sn_season', { n: seasonNum })}</div>
          <div className="sn-name">{current.name}</div>
        </div>
        <div className="sn-mybp">
          <div className="sn-mybp-label">{t('sn_your_bp')}</div>
          <div className="sn-mybp-value">{Number(mySeasonBP).toLocaleString()}</div>
        </div>
        <span className="sn-toggle">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="sn-expanded">
          <div className="sn-story">{current.story}</div>

          {current.mechanic !== 'standard' && (
            <div className="sn-mechanic">
              {current.mechanic === 'double_crits' && <span>{t('sn_mechanic_crits')}</span>}
              {current.mechanic === 'artifact_boost' && <span>{t('sn_mechanic_artifact')}</span>}
              {current.mechanic === 'energy_drain' && <span>{t('sn_mechanic_energy')}</span>}
            </div>
          )}

          <div className="sn-leaderboard">
            <div className="sn-lb-title">{t('sn_lb_title')}</div>
            {topPlayers.map(p => (
              <div key={p.rank} className="sn-lb-row">
                <span className="sn-lb-rank">#{p.rank}</span>
                <span className="sn-lb-name">{p.username}</span>
                <span className="sn-lb-bp">{Number(p.bp).toLocaleString()} BP</span>
              </div>
            ))}
          </div>

          {next && (
            <div className="sn-next">
              <span className="sn-next-label">{t('sn_next_label')}</span>
              <span className="sn-next-icon">{next.icon}</span>
              <span className="sn-next-name">{next.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
