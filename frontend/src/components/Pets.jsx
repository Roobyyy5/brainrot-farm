import { useState, useEffect } from 'react';
import { api } from '../api';

const RARITY_COLOR = { common: '#9ca3af', uncommon: '#34d399', rare: '#60a5fa', legendary: '#f59e0b' };

export default function Pets() {
  const [pets, setPets] = useState([]);
  const [activePet, setActivePet] = useState('');
  const [acting, setActing] = useState(false);

  const load = () => api.pets.list().then(d => { setPets(d.pets); setActivePet(d.activePet); });
  useEffect(() => { load(); }, []);

  const handleEquip = async (petKey) => {
    if (acting) return;
    setActing(true);
    try {
      const newKey = petKey === activePet ? '' : petKey;
      await api.pets.equip(newKey);
      setActivePet(newKey);
    } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const owned = pets.filter(p => p.owned);
  const locked = pets.filter(p => !p.owned);

  return (
    <div className="pets-section">
      <div className="pets-header">🐾 Pets</div>
      <div className="pets-sub">Pets give permanent bonuses. Obtained from Loot Boxes.</div>

      {owned.length > 0 && (
        <>
          <div className="pets-group-title">Your Pets</div>
          <div className="pets-grid">
            {owned.map(p => (
              <div
                key={p.key}
                className={`pet-card${p.key === activePet ? ' pet-card--active' : ''}`}
                style={{ borderColor: RARITY_COLOR[p.rarity] }}
                onClick={() => handleEquip(p.key)}
              >
                <div className="pet-icon">{p.icon}</div>
                <div className="pet-name">{p.name}</div>
                <div className="pet-rarity" style={{ color: RARITY_COLOR[p.rarity] }}>{p.rarity}</div>
                <div className="pet-desc">{p.desc}</div>
                {p.key === activePet && <div className="pet-active-badge">✓ Active</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {locked.length > 0 && (
        <>
          <div className="pets-group-title" style={{ marginTop: 12 }}>Locked</div>
          <div className="pets-grid">
            {locked.map(p => (
              <div key={p.key} className="pet-card pet-card--locked" style={{ borderColor: '#333' }}>
                <div className="pet-icon" style={{ filter: 'grayscale(1)' }}>{p.icon}</div>
                <div className="pet-name">{p.name}</div>
                <div className="pet-rarity" style={{ color: RARITY_COLOR[p.rarity] }}>{p.rarity}</div>
                <div className="pet-desc">{p.desc}</div>
                <div className="pet-locked-hint">🎁 From Loot Box</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
