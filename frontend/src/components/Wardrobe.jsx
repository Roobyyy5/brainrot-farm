import { useState, useEffect } from 'react';
import { api } from '../api';

const UNLOCK_LABEL = { default: 'Default', prestige: 'Prestige', gem_shop: 'Gem Shop' };

export default function Wardrobe() {
  const [data, setData] = useState(null);
  const [equipping, setEquipping] = useState(null);

  const load = () => api.wardrobe.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleEquip = async (skinKey) => {
    if (equipping) return;
    setEquipping(skinKey);
    try { await api.wardrobe.equip(skinKey); load(); }
    catch (err) { alert(err.message); }
    finally { setEquipping(null); }
  };

  if (!data) return null;
  const { skins, selected } = data;

  return (
    <div className="wardrobe-section">
      <div className="wardrobe-header">👗 Skin Wardrobe</div>
      <div className="wardrobe-grid">
        {skins.map(skin => (
          <div
            key={skin.key}
            className={`wardrobe-card${skin.active ? ' wardrobe-card--active' : ''}${!skin.owned ? ' wardrobe-card--locked' : ''}`}
            onClick={() => skin.owned && !skin.active && handleEquip(skin.key)}
          >
            <div className="wardrobe-emoji">{skin.emoji}</div>
            <div className="wardrobe-name">{skin.name}</div>
            <div className="wardrobe-unlock">{UNLOCK_LABEL[skin.unlock] || skin.unlock}</div>
            {skin.active && <div className="wardrobe-active-badge">Equipped</div>}
            {!skin.owned && <div className="wardrobe-locked-badge">🔒</div>}
            {skin.owned && !skin.active && (
              <button className="wardrobe-equip-btn" disabled={equipping === skin.key}>
                {equipping === skin.key ? '...' : 'Equip'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
