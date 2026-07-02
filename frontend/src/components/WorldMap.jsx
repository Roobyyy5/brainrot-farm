import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function WorldMap() {
  const t = useT();
  const [zones, setZones] = useState([]);
  const [currentZone, setCurrentZone] = useState(1);
  const [advancing, setAdvancing] = useState(false);

  const load = () => api.worlds.list().then(d => {
    setZones(d.zones);
    setCurrentZone(d.currentZone);
  });
  useEffect(() => { load(); }, []);

  const handleAdvance = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      const res = await api.worlds.advance();
      setCurrentZone(res.zone.zone);
      load();
    } catch (err) { alert(err.message); }
    finally { setAdvancing(false); }
  };

  const advanceable = zones.find(z => z.canAdvance);

  return (
    <div className="worlds-section">
      <div className="worlds-header">{t('wmap_title')}</div>
      <div className="worlds-sub">{t('wmap_no_bonuses')}</div>
      <div className="worlds-list">
        {zones.map(z => (
          <div
            key={z.zone}
            className={`zone-card${z.current ? ' zone-card--current' : ''}${z.unlocked && !z.current ? ' zone-card--done' : ''}${!z.unlocked ? ' zone-card--locked' : ''}`}
          >
            <div className="zone-icon">{z.icon}</div>
            <div className="zone-info">
              <div className="zone-name">{z.zone}. {z.name}</div>
              <div className="zone-desc">{z.desc}</div>
              {z.tapPowerBonus > 0 && (
                <div className="zone-bonus">{t('wmap_tap_bonus', { n: z.tapPowerBonus })}</div>
              )}
            </div>
            <div className="zone-status">
              {z.current && <span className="zone-badge zone-badge--here">{t('wmap_here')}</span>}
              {z.unlocked && !z.current && <span className="zone-badge zone-badge--done">✓</span>}
              {!z.unlocked && (
                <span className="zone-badge zone-badge--locked">
                  🔒 {(z.unlockTaps / 1000).toFixed(0)}K
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {advanceable && (
        <button className="worlds-advance-btn" onClick={handleAdvance} disabled={advancing}>
          {advancing ? '...' : t('wmap_advance', { name: advanceable.name })}
        </button>
      )}
    </div>
  );
}
