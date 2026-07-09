import { useState, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function BossCard({ boss, tapPower, multiTap, energy, onDamage }) {
  const t = useT();
  const [floats, setFloats] = useState([]);
  const floatId = useRef(0);

  const hpPct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
  const timeLeft = Math.max(0, boss.endsAt - Date.now());
  const hours = Math.floor(timeLeft / 3_600_000);
  const mins = Math.floor((timeLeft % 3_600_000) / 60_000);

  const handleBossTap = (e) => {
    e.preventDefault();
    const floorEnergy = Math.floor(energy);
    if (floorEnergy < 1) return;
    const clicks = Math.min(multiTap || 1, floorEnergy);

    const id = ++floatId.current;
    const dmg = clicks * (tapPower || 1);
    setFloats((f) => [...f.slice(-3), { id, dmg }]);
    setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 900);

    onDamage?.(clicks, false);
    api.tapper.bossTap(boss.id, clicks).then((res) => {
      if (res.killed) onDamage?.(0, true, res.reward);
    }).catch(() => {});
  };

  return (
    <div className="boss-card">
      <div className="boss-header">
        <span className="boss-emoji">👾</span>
        <div className="boss-meta">
          <span className="boss-name">{boss.name}</span>
          <span className="boss-timer">{t('bosscard_timer', { h: hours, m: mins })}</span>
        </div>
        <div className="boss-reward">🪙 {boss.reward}</div>
      </div>

      <div className="boss-hp-wrap">
        <div className="boss-hp-labels">
          <span>HP</span>
          <span>{boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()}</span>
        </div>
        <div className="boss-hp-track">
          <div className="boss-hp-fill" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      <div className="boss-fight-area">
        <button
          type="button"
          className="boss-tap-btn"
          onClick={handleBossTap}
          disabled={Math.floor(energy) < 1}
        >
          <span className="boss-tap-icon">⚔️</span>
          <span>{t('bosscard_attack')}</span>
          {floats.map((fl) => (
            <span key={fl.id} className="boss-float">-{fl.dmg}</span>
          ))}
        </button>
        {boss.myDamage > 0 && (
          <span className="boss-my-dmg">{t('bosscard_my_dmg', { n: boss.myDamage.toLocaleString() })}</span>
        )}
      </div>
    </div>
  );
}
