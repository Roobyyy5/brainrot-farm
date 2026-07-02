import { useState, useEffect } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';

export default function TerritoryMap() {
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

  const sel = data.territories.find(t => t.id === selected);

  return (
    <div className="territory-panel">
      <div className="territory-header">🗺️ Guild Territories</div>
      <div className="territory-sub">
        Тапай на регіон щоб захопити його для гільдії • Поріг: {(data.captureThreshold / 1000).toFixed(0)}k тапів
      </div>

      {!data.myGuildId && (
        <div className="territory-no-guild">⚠️ Потрібна гільдія щоб брати участь</div>
      )}

      <div className="territory-grid">
        {data.territories.map(t => {
          const controlled = t.controlledBy;
          const isMyGuild = t.isMyGuild;
          const pct = Math.min(100, (t.myGuildTaps / data.captureThreshold) * 100);
          return (
            <div
              key={t.id}
              className={`territory-card ${isMyGuild ? 'mine' : controlled ? 'enemy' : 'neutral'} ${selected === t.id ? 'selected' : ''}`}
              style={{ borderColor: isMyGuild ? '#34d399' : controlled ? '#ef4444' : t.color }}
              onClick={() => setSelected(selected === t.id ? null : t.id)}
            >
              <div className="territory-icon" style={{ color: t.color }}>{t.icon}</div>
              <div className="territory-name">{t.name}</div>
              {controlled && (
                <div className="territory-owner" style={{ color: isMyGuild ? '#34d399' : '#f87171' }}>
                  {isMyGuild ? '✅ Наша' : `[${controlled.tag}]`}
                </div>
              )}
              {data.myGuildId && (
                <div className="territory-my-bar">
                  <div className="territory-my-fill" style={{ width: `${pct}%`, background: t.color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sel && (
        <div className="territory-detail">
          <div className="territory-detail-name">{sel.icon} {sel.name}</div>
          <div className="territory-detail-bonus">
            Бонус: {formatBonus(sel.bonus)}
          </div>
          {sel.controlledBy ? (
            <div className="territory-detail-ctrl">
              Контролює: <b>{sel.controlledBy.name}</b> [{sel.controlledBy.tag}]
            </div>
          ) : (
            <div className="territory-detail-ctrl neutral">Нейтральна територія</div>
          )}
          <div className="territory-detail-taps">
            Мої тапи: {sel.myGuildTaps.toLocaleString()} / {data.captureThreshold.toLocaleString()}
          </div>
          {data.myGuildId && (
            <button
              className="territory-tap-btn"
              onClick={() => tap(sel.id)}
              disabled={loading}
            >
              ⚔️ Атакувати (+100 тапів)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatBonus(bonus) {
  const parts = [];
  if (bonus.tapMultiplier) parts.push(`+${Math.round(bonus.tapMultiplier * 100)}% тап`);
  if (bonus.energyMax)    parts.push(`+${bonus.energyMax} енергія`);
  if (bonus.passiveIncome)parts.push(`+${Math.round(bonus.passiveIncome * 100)}% пасив`);
  if (bonus.gemBonus)     parts.push(`+${Math.round(bonus.gemBonus * 100)}% gems`);
  if (bonus.xpBonus)      parts.push(`+${Math.round(bonus.xpBonus * 100)}% XP`);
  if (bonus.energyRegen)  parts.push(`+${Math.round(bonus.energyRegen * 100)}% regen`);
  return parts.join(', ') || '—';
}
