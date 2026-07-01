import { useState, useEffect } from 'react';
import { api } from '../api';

const RARITY_COLOR = { common: '#9ca3af', uncommon: '#34d399', rare: '#60a5fa' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [using, setUsing] = useState(null);
  const [effect, setEffect] = useState(null);

  const load = () => api.inventory.list().then(d => setItems(d.items)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleUse = async (itemKey) => {
    if (using) return;
    setUsing(itemKey);
    try {
      const res = await api.inventory.use(itemKey);
      setEffect(res.effect);
      setTimeout(() => setEffect(null), 2000);
      load();
    } catch (err) { alert(err.message); }
    finally { setUsing(null); }
  };

  const owned = items.filter(i => i.quantity > 0);

  return (
    <div className="inventory-section">
      <div className="inventory-header">🎒 Inventory</div>
      <div className="inventory-sub">Consumable items from Loot Boxes.</div>
      {effect && (
        <div className="inventory-effect-toast">
          {effect.type === 'energy_refill' && '⚡ Energy refilled!'}
          {effect.type === 'xp' && `📜 +${effect.amount} Battle Pass XP!`}
          {effect.type === 'crit_shield' && '🛡️ 100% crit for 60s!'}
          {effect.type === 'gems' && `💎 +${effect.amount} gems!`}
        </div>
      )}
      {owned.length === 0 ? (
        <div className="inventory-empty">No items yet. Open Loot Boxes to get them!</div>
      ) : (
        <div className="inventory-grid">
          {owned.map(item => (
            <div key={item.key} className="inventory-item">
              <div className="inv-icon">{item.icon}</div>
              <div className="inv-name">{item.name}</div>
              <div className="inv-rarity" style={{ color: RARITY_COLOR[item.rarity] }}>{item.rarity}</div>
              <div className="inv-desc">{item.desc}</div>
              <div className="inv-qty">×{item.quantity}</div>
              <button
                className="inv-use-btn"
                onClick={() => handleUse(item.key)}
                disabled={using === item.key}
              >
                {using === item.key ? '...' : 'USE'}
              </button>
            </div>
          ))}
        </div>
      )}
      {items.filter(i => i.quantity === 0).length > 0 && (
        <div className="inventory-locked-row">
          {items.filter(i => i.quantity === 0).map(item => (
            <div key={item.key} className="inv-locked-chip">
              {item.icon} {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
