import { useState, useEffect } from 'react';
import { api } from '../api';

const RARITY_COLOR = { common: '#9ca3af', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };

export default function CardFusion() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null); // { cardKey }
  const [targetSlot, setTargetSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fusing, setFusing] = useState(false);

  const load = () => api.cardfusion.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const fuse = async () => {
    if (!selected || !targetSlot) return;
    setFusing(true);
    setTimeout(async () => {
      try {
        await api.cardfusion.fuse(selected.cardKey, targetSlot);
        await load();
        setSelected(null); setTargetSlot(null);
      } catch (err) { alert(err.message); }
      finally { setFusing(false); }
    }, data?.config?.fusionAnimDurationMs || 1500);
  };

  const destroy = async (slot) => {
    if (!confirm('Знищити Fusion картку?')) return;
    setLoading(true);
    try { await api.cardfusion.destroy(slot); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  return (
    <div className="fusion-panel">
      <div className="fusion-header">✨ Card Fusion</div>
      <div className="fusion-sub">
        Поєднай {data.config?.cardsRequiredToFuse || 3} копії однієї картки → Fusion (×{data.config?.fusionMultiplier || 3.5} бонус)
      </div>

      <div className="fusion-slots">
        {data.fusionSlots?.map(s => (
          <div
            key={s.slot}
            className={`fusion-slot ${s.card ? 'occupied' : 'empty'} ${targetSlot === s.slot ? 'targeted' : ''}`}
            onClick={() => { if (!s.card) setTargetSlot(s.slot === targetSlot ? null : s.slot); }}
          >
            {s.card ? (
              <div className="fusion-slot-card">
                <div className="fusion-slot-icon">✨</div>
                <div className="fusion-slot-name">{s.card.card_key}</div>
                <div className="fusion-slot-mult">×{data.config?.fusionMultiplier}</div>
                <button className="fusion-destroy-btn" onClick={(e) => { e.stopPropagation(); destroy(s.slot); }} disabled={loading}>🗑</button>
              </div>
            ) : (
              <div className="fusion-slot-empty">
                {targetSlot === s.slot ? '🎯 Слот обрано' : `Слот ${s.slot}`}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.fusableCards?.length > 0 ? (
        <>
          <div className="fusion-available-title">Доступні для fusion:</div>
          <div className="fusion-cards-list">
            {data.fusableCards.map(c => (
              <div
                key={c.key}
                className={`fusion-card-item ${selected?.cardKey === c.key ? 'selected' : ''}`}
                onClick={() => setSelected(selected?.cardKey === c.key ? null : { cardKey: c.key })}
              >
                <span className="fusion-card-key">{c.key}</span>
                <span className="fusion-card-count">{c.count}× копій</span>
              </div>
            ))}
          </div>
          <button
            className="fusion-btn"
            onClick={fuse}
            disabled={!selected || !targetSlot || loading || fusing}
          >
            {fusing ? '✨ Fusion...' : selected && targetSlot ? `✨ Fuse ${selected.cardKey} → Слот ${targetSlot}` : 'Обери картку і слот'}
          </button>
        </>
      ) : (
        <div className="fusion-empty-state">
          Потрібно {data.config?.cardsRequiredToFuse || 3}+ копій однієї картки для fusion.<br />
          Купуй картки у магазині карток.
        </div>
      )}
    </div>
  );
}
