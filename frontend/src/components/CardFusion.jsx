import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const RARITY_COLOR = { common: '#9ca3af', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };

export default function CardFusion() {
  const t = useT();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
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
    if (!confirm(t('fusion_destroy_confirm'))) return;
    setLoading(true);
    try { await api.cardfusion.destroy(slot); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const fuseBtnLabel = () => {
    if (fusing) return t('fusion_btn_fusing');
    if (selected && targetSlot) return t('fusion_btn_fuse', { card: selected.cardKey, slot: targetSlot });
    return t('fusion_btn_select');
  };

  return (
    <div className="fusion-panel">
      <div className="fusion-header">{t('fusion_header')}</div>
      <div className="fusion-sub">
        {t('fusion_sub', { n: data.config?.cardsRequiredToFuse || 3, m: data.config?.fusionMultiplier || 3.5 })}
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
                {targetSlot === s.slot ? t('fusion_slot_selected') : t('fusion_slot', { n: s.slot })}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.fusableCards?.length > 0 ? (
        <>
          <div className="fusion-available-title">{t('fusion_available')}</div>
          <div className="fusion-cards-list">
            {data.fusableCards.map(c => (
              <div
                key={c.key}
                className={`fusion-card-item ${selected?.cardKey === c.key ? 'selected' : ''}`}
                onClick={() => setSelected(selected?.cardKey === c.key ? null : { cardKey: c.key })}
              >
                <span className="fusion-card-key">{c.key}</span>
                <span className="fusion-card-count">{t('fusion_copies', { n: c.count })}</span>
              </div>
            ))}
          </div>
          <button
            className="fusion-btn"
            onClick={fuse}
            disabled={!selected || !targetSlot || loading || fusing}
          >
            {fuseBtnLabel()}
          </button>
        </>
      ) : (
        <div className="fusion-empty-state">
          {t('fusion_empty', { n: data.config?.cardsRequiredToFuse || 3 })}
        </div>
      )}
    </div>
  );
}
