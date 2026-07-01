import { useState } from 'react';
import { api } from '../api';

export default function BossCard({ boss, tapPower, multiTap, energy, onDamage }) {
  const [tapping, setTapping] = useState(false);
  const [floats, setFloats] = useState([]);
  const floatId = { current: 0 };

  const hpPct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
  const timeLeft = Math.max(0, boss.endsAt - Date.now());
  const hours = Math.floor(timeLeft / 3_600_000);
  const mins = Math.floor((timeLeft % 3_600_000) / 60_000);

  const handleBossTap = async () => {
    if (tapping || energy < 1) return;
    const clicks = Math.min(multiTap || 1, energy);
    setTapping(true);

    const id = ++floatId.current;
    const dmg = clicks * (tapPower || 1);
    setFloats((f) => [...f, { id, dmg }]);
    setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 900);

    try {
      const res = await api.tapper.bossTap(boss.id, clicks);
      onDamage?.(clicks, res.killed, res.reward);
    } catch {}
    setTapping(false);
  };

  return (
    <div className="boss-card">
      <div className="boss-header">
        <span className="boss-emoji">👾</span>
        <div className="boss-meta">
          <span className="boss-name">{boss.name}</span>
          <span className="boss-timer">{hours}h {mins}m left</span>
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
          className={`boss-tap-btn${tapping ? ' boss-tap-btn--active' : ''}`}
          onClick={handleBossTap}
          disabled={energy < 1}
        >
          <span className="boss-tap-icon">⚔️</span>
          <span>Attack Boss</span>
          {floats.map((fl) => (
            <span key={fl.id} className="boss-float">-{fl.dmg}</span>
          ))}
        </button>
        {boss.myDamage > 0 && (
          <span className="boss-my-dmg">Your damage: {boss.myDamage.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
