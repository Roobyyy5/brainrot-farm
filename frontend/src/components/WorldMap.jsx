import { useState, useEffect } from 'react';
import { api } from '../api';

export default function WorldMap() {
  const [zones, setZones] = useState([]);
  const [currentZone, setCurrentZone] = useState(1);
  const [totalTaps, setTotalTaps] = useState(0);
  const [advancing, setAdvancing] = useState(false);

  const load = () => api.worlds.list().then(d => {
    setZones(d.zones);
    setCurrentZone(d.currentZone);
    setTotalTaps(d.totalTaps);
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

  return (
    <div className="worlds-section">
      <div className="worlds-header">🗺️ World Map</div>
      <div className="worlds-sub">Advance zones to unlock permanent tap power bonuses.</div>
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
                <div className="zone-bonus">⚡ +{z.tapPowerBonus} Tap Power</div>
              )}
            </div>
            <div className="zone-status">
              {z.current && <span className="zone-badge zone-badge--here">HERE</span>}
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

      {zones.find(z => z.canAdvance) && (
        <button className="worlds-advance-btn" onClick={handleAdvance} disabled={advancing}>
          {advancing ? '...' : `⬆️ Advance to ${zones.find(z => z.canAdvance)?.name}`}
        </button>
      )}
    </div>
  );
}
