import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const RARITY_COLOR = {
  common: '#9ca3af',
  rare: '#60a5fa',
  epic: '#a78bfa',
  legendary: '#f59e0b',
};

const SLOTS = ['weapon', 'armor', 'relic', 'charm'];
const SLOT_ICON = { weapon: '⚔️', armor: '🛡️', relic: '🏺', charm: '🍀' };

export default function Artifacts() {
  const t = useT();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('equipped');
  const [loading, setLoading] = useState(false);
  const [combineTarget, setCombineTarget] = useState(null);

  const load = () => api.artifacts.list().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const equip = async (id) => {
    setLoading(true);
    try { await api.artifacts.equip(id); load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const unequip = async (slot) => {
    setLoading(true);
    try { await api.artifacts.unequip(slot); load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const combine = async (key, rarity) => {
    setLoading(true);
    try { await api.artifacts.combine(key, rarity); load(); setCombineTarget(null); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const equippedKeys = Object.values(data.equipped || {}).map(a => a.key);

  const grouped = {};
  for (const art of data.inventory || []) {
    const k = `${art.key}:${art.rarity}`;
    if (!grouped[k]) grouped[k] = { ...art, count: 0, ids: [] };
    grouped[k].count++;
    grouped[k].ids.push(art.id);
  }

  return (
    <div className="artifacts-panel">
      <div className="artifacts-header">{t('art_header')}</div>

      {equippedKeys.length >= 2 && (
        <div className="artifacts-sets">
          <div className="artifacts-sets-title">{t('art_sets_title')}</div>
          {Object.entries({
            iron_warrior:   { name: 'Iron Warrior',    pieces: ['iron_fist','leather_skull'],      bonus: '+5 TP +500 E',       icon: '⚔️' },
            crystal_mage:   { name: 'Crystal Mage',    pieces: ['steel_brain','iron_helmet'],       bonus: '+5% crit ×1.3 tap',  icon: '🔮' },
            golden_legend:  { name: 'Golden Legend',   pieces: ['golden_mind','crystal_core'],      bonus: '+15 TP +5% gems',    icon: '✨' },
            void_reaper:    { name: 'Void Reaper',     pieces: ['omega_tap','void_shell'],          bonus: '×2 tap +15% crit',   icon: '🌑' },
            nature_spirit:  { name: 'Nature Spirit',   pieces: ['lucky_coin','bronze_relic'],       bonus: '+3% gems +15% cards',icon: '🌿' },
            chaos_master:   { name: 'Chaos Master',    pieces: ['chaos_stone','eternal_relic'],     bonus: '×3 tap +75% offline',icon: '🌀' },
            full_legendary: { name: 'FULL LEGEND SET', pieces: ['omega_tap','void_shell','eternal_relic','chaos_stone'], bonus: '×5 tap +25% crit',icon: '💥' },
          }).filter(([, s]) => s.pieces.every(p => equippedKeys.includes(p))).map(([key, s]) => (
            <div key={key} className="artifact-set-badge">
              {s.icon} <b>{s.name}</b> — {s.bonus}
            </div>
          ))}
        </div>
      )}

      <div className="artifacts-tabs">
        <button className={tab === 'equipped' ? 'active' : ''} onClick={() => setTab('equipped')}>{t('art_tab_equipped')}</button>
        <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>{t('art_tab_inv')}</button>
      </div>

      {tab === 'equipped' && (
        <div className="artifacts-slots">
          {SLOTS.map(slot => {
            const art = data.equipped?.[slot];
            return (
              <div key={slot} className="artifact-slot">
                <div className="artifact-slot-label">{SLOT_ICON[slot]} {slot}</div>
                {art ? (
                  <div className="artifact-card" style={{ borderColor: RARITY_COLOR[art.rarity] }}>
                    <span className="artifact-icon">{art.icon}</span>
                    <span className="artifact-name">{art.name}</span>
                    <span className="artifact-rarity" style={{ color: RARITY_COLOR[art.rarity] }}>{art.rarity}</span>
                    <div className="artifact-stats">
                      {Object.entries(art.stats || {}).map(([k, v]) => (
                        <span key={k} className="artifact-stat">+{typeof v === 'number' && v < 1 ? `${(v*100).toFixed(0)}%` : v} {k}</span>
                      ))}
                    </div>
                    <button className="artifact-unequip-btn" onClick={() => unequip(slot)} disabled={loading}>{t('relics_unequip')}</button>
                  </div>
                ) : (
                  <div className="artifact-slot-empty">{t('art_slot_empty')}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="artifacts-inventory">
          {Object.values(grouped).length === 0 && (
            <div className="artifacts-empty">{t('relics_no_relics')}</div>
          )}
          {Object.values(grouped).map(g => (
            <div key={`${g.key}:${g.rarity}`} className="artifact-inv-card" style={{ borderColor: RARITY_COLOR[g.rarity] }}>
              <span className="artifact-icon">{g.icon}</span>
              <div className="artifact-inv-info">
                <div className="artifact-name">{g.name} ×{g.count}</div>
                <div className="artifact-rarity" style={{ color: RARITY_COLOR[g.rarity] }}>{g.rarity}</div>
                <div className="artifact-slot-tag">{g.slot}</div>
              </div>
              <div className="artifact-inv-actions">
                {!data.equipped?.[g.slot] && (
                  <button className="artifact-equip-btn" onClick={() => equip(g.ids[0])} disabled={loading}>{t('relics_equip')}</button>
                )}
                {g.count >= 3 && ['common','rare','epic'].includes(g.rarity) && (
                  <button className="artifact-combine-btn" onClick={() => combine(g.key, g.rarity)} disabled={loading}>
                    {t('art_combine')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
