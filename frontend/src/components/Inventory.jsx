import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const RARITY_COLOR = { common: '#9ca3af', uncommon: '#34d399', rare: '#60a5fa' };

export default function Inventory() {
  const t = useT();
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

  const itemName = (item) => { const k = `item_${item.key}_name`; const v = t(k); return v === k ? item.name : v; }
  const itemRarity = (item) => { const k = `rarity_${item.rarity}`; const v = t(k); return v === k ? item.rarity : v; }
  const itemDesc = (item) => { const k = `item_${item.key}_desc`; const v = t(k); return v === k ? item.desc : v; }

  const owned = items.filter(i => i.quantity > 0);

  return (
    <div className="inventory-section">
      <div className="inventory-header">🎒 {t('inv_title')}</div>
      <div className="inventory-sub">{t('inv_subtitle')}</div>
      {effect && (
        <div className="inventory-effect-toast">
          {effect.type === 'energy_refill' && t('inv_effect_energy')}
          {effect.type === 'xp' && t('inv_effect_xp', { n: effect.amount })}
          {effect.type === 'crit_shield' && t('inv_effect_crit')}
          {effect.type === 'gems' && t('inv_effect_gems', { n: effect.amount })}
        </div>
      )}
      {owned.length === 0 ? (
        <div className="inventory-empty">{t('inv_no_items')}</div>
      ) : (
        <div className="inventory-grid">
          {owned.map(item => (
            <div key={item.key} className="inventory-item">
              <div className="inv-icon">{item.icon}</div>
              <div className="inv-name">{itemName(item)}</div>
              <div className="inv-rarity" style={{ color: RARITY_COLOR[item.rarity] }}>{itemRarity(item)}</div>
              <div className="inv-desc">{itemDesc(item)}</div>
              <div className="inv-qty">×{item.quantity}</div>
              <button
                className="inv-use-btn"
                onClick={() => handleUse(item.key)}
                disabled={using === item.key}
              >
                {using === item.key ? '...' : t('inv_use')}
              </button>
            </div>
          ))}
        </div>
      )}
      {items.filter(i => i.quantity === 0).length > 0 && (
        <div className="inventory-locked-row">
          {items.filter(i => i.quantity === 0).map(item => (
            <div key={item.key} className="inv-locked-chip">
              {item.icon} {itemName(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
