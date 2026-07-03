import { useState, useEffect } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useT } from '../context/LangContext';

export default function TerritoryMap() {
  const t = useT();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.territories.list().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  useWebSocket({
    rooms: ['territories'],
    onMessage: (msg) => { if (msg.type === 'territory_update') load(); },
  });

  const tap = async (territoryId) => {
    setLoading(true);
    try { await api.territories.tap(territoryId, 100); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const terName = (ter) => { const k = `ter_name_${ter.id}`; const v = t(k); return v === k ? ter.name : v; }

  const sel = data.territories.find(ter => ter.id === selected);

  return (
    <div className="territory-panel">
      <div className="territory-header">{t('ter_header')}</div>
      <div className="territory-sub">
        {t('ter_sub', { n: (data.captureThreshold / 1000).toFixed(0) })}
      </div>

      {!data.myGuildId && (
        <div className="territory-no-guild">{t('ter_no_guild')}</div>
      )}

      <div className="territory-grid">
        {data.territories.map(ter => {
          const controlled = ter.controlledBy;
          const isMyGuild = ter.isMyGuild;
          const pct = Math.min(100, (ter.myGuildTaps / data.captureThreshold) * 100);
          return (
            <div
              key={ter.id}
              className={`territory-card ${isMyGuild ? 'mine' : controlled ? 'enemy' : 'neutral'} ${selected === ter.id ? 'selected' : ''}`}
              style={{ borderColor: isMyGuild ? '#34d399' : controlled ? '#ef4444' : ter.color }}
              onClick={() => setSelected(selected === ter.id ? null : ter.id)}
            >
              <div className="territory-icon" style={{ color: ter.color }}>{ter.icon}</div>
              <div className="territory-name">{terName(ter)}</div>
              {controlled && (
                <div className="territory-owner" style={{ color: isMyGuild ? '#34d399' : '#f87171' }}>
                  {isMyGuild ? t('ter_mine') : `[${controlled.tag}]`}
                </div>
              )}
              {data.myGuildId && (
                <div className="territory-my-bar">
                  <div className="territory-my-fill" style={{ width: `${pct}%`, background: ter.color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sel && (
        <div className="territory-detail">
          <div className="territory-detail-name">{sel.icon} {terName(sel)}</div>
          <div className="territory-detail-bonus">
            {t('ter_bonus', { n: formatBonus(sel.bonus) })}
          </div>
          {sel.controlledBy ? (
            <div className="territory-detail-ctrl">
              {t('ter_controlled_by', { name: sel.controlledBy.name, tag: sel.controlledBy.tag })}
            </div>
          ) : (
            <div className="territory-detail-ctrl neutral">{t('ter_neutral')}</div>
          )}
          <div className="territory-detail-taps">
            {t('ter_my_taps', { cur: sel.myGuildTaps.toLocaleString(), max: data.captureThreshold.toLocaleString() })}
          </div>
          {data.myGuildId && (
            <button
              className="territory-tap-btn"
              onClick={() => tap(sel.id)}
              disabled={loading}
            >
              {t('ter_attack')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatBonus(bonus) {
  const parts = [];
  if (bonus.tapMultiplier) parts.push(`+${Math.round(bonus.tapMultiplier * 100)}% tap`);
  if (bonus.energyMax)    parts.push(`+${bonus.energyMax} energy`);
  if (bonus.passiveIncome)parts.push(`+${Math.round(bonus.passiveIncome * 100)}% passive`);
  if (bonus.gemBonus)     parts.push(`+${Math.round(bonus.gemBonus * 100)}% gems`);
  if (bonus.xpBonus)      parts.push(`+${Math.round(bonus.xpBonus * 100)}% XP`);
  if (bonus.energyRegen)  parts.push(`+${Math.round(bonus.energyRegen * 100)}% regen`);
  return parts.join(', ') || '—';
}
