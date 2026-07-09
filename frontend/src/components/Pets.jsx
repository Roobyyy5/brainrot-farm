import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

const RARITY_COLOR = { common: '#9ca3af', uncommon: '#34d399', rare: '#60a5fa', legendary: '#f59e0b' };

export default function Pets() {
  const t = useT();
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
    } catch (err) { toastError(err.message); }
    finally { setActing(false); }
  };

  const petName = (p) => { const k = `pet_${p.key}_name`; const v = t(k); return v === k ? p.name : v; }
  const petRarity = (p) => { const k = `rarity_${p.rarity}`; const v = t(k); return v === k ? p.rarity : v; }
  const petDesc = (p) => { const k = `pet_${p.key}_desc`; const v = t(k); return v === k ? p.desc : v; }

  const owned = pets.filter(p => p.owned);
  const locked = pets.filter(p => !p.owned);

  return (
    <div className="pets-section">
      <div className="pets-header">🐾 {t('pets_title')}</div>
      <div className="pets-sub">{t('pets_subtitle')}</div>

      {owned.length > 0 && (
        <>
          <div className="pets-group-title">{t('pets_your')}</div>
          <div className="pets-grid">
            {owned.map(p => (
              <div
                key={p.key}
                className={`pet-card${p.key === activePet ? ' pet-card--active' : ''}`}
                style={{ borderColor: RARITY_COLOR[p.rarity] }}
                onClick={() => handleEquip(p.key)}
              >
                <div className="pet-icon">{p.icon}</div>
                <div className="pet-name">{petName(p)}</div>
                <div className="pet-rarity" style={{ color: RARITY_COLOR[p.rarity] }}>{petRarity(p)}</div>
                <div className="pet-desc">{petDesc(p)}</div>
                {p.key === activePet && <div className="pet-active-badge">{t('pets_active_badge')}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {locked.length > 0 && (
        <>
          <div className="pets-group-title" style={{ marginTop: 12 }}>{t('pets_locked')}</div>
          <div className="pets-grid">
            {locked.map(p => (
              <div key={p.key} className="pet-card pet-card--locked" style={{ borderColor: '#333' }}>
                <div className="pet-icon" style={{ filter: 'grayscale(1)' }}>{p.icon}</div>
                <div className="pet-name">{petName(p)}</div>
                <div className="pet-rarity" style={{ color: RARITY_COLOR[p.rarity] }}>{petRarity(p)}</div>
                <div className="pet-desc">{petDesc(p)}</div>
                <div className="pet-locked-hint">{t('pets_lootbox')}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
