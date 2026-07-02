import { useState, useEffect } from 'react';
import { api } from '../api';

export default function RelicsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.relics.list().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (fn) => {
    setLoading(true);
    try { await fn(); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  return (
    <div className="relics-panel">
      <div className="relics-header">🔷 Prestige Relics</div>
      <div className="relics-sub">
        Ascension 3+ unlocks Relics — a 5th equipment slot with active abilities.
        Current Ascension: <b>{data.ascensionCount}</b>
      </div>

      <div className="relics-list">
        {(data.relics || []).map(r => {
          const cooldownLeft = r.cooldownEndsAt ? Math.max(0, Math.ceil((r.cooldownEndsAt - Date.now()) / 1000)) : 0;
          const onCooldown = cooldownLeft > 0;
          const fmtCd = onCooldown
            ? `${Math.floor(cooldownLeft / 60)}m ${cooldownLeft % 60}s`
            : null;

          return (
            <div key={r.key} className={`relic-card ${r.equipped ? 'equipped' : ''} ${!r.unlockable ? 'locked' : ''}`}>
              <div className="relic-card-top">
                <span className="relic-icon">{r.icon}</span>
                <div className="relic-info">
                  <div className="relic-name">{r.name}</div>
                  <div className="relic-passive">{r.passiveDesc}</div>
                  <div className="relic-active">⚡ {r.activeDesc}</div>
                  <div className="relic-cd-info">Cooldown: {Math.round(r.activeCooldownMs / 60000)}min</div>
                </div>
                {!r.unlockable && (
                  <div className="relic-lock">🔒 Asc {r.requiredAscension}</div>
                )}
                {r.unlockable && !r.owned && (
                  <button className="relic-btn relic-btn--grant" onClick={() => act(() => api.relics.grant(r.key))} disabled={loading}>
                    Claim
                  </button>
                )}
              </div>

              {r.owned && (
                <div className="relic-actions">
                  {r.equipped ? (
                    <>
                      <span className="relic-equipped-badge">✅ Equipped</span>
                      {onCooldown ? (
                        <span className="relic-cooldown">⏳ {fmtCd}</span>
                      ) : (
                        <button className="relic-btn relic-btn--activate" onClick={() => act(() => api.relics.activate(r.key))} disabled={loading}>
                          ⚡ Activate
                        </button>
                      )}
                      <button className="relic-btn relic-btn--unequip" onClick={() => act(() => api.relics.unequip())} disabled={loading}>
                        Unequip
                      </button>
                    </>
                  ) : (
                    <button className="relic-btn relic-btn--equip" onClick={() => act(() => api.relics.equip(r.key))} disabled={loading || !!data.equippedRelic}>
                      {data.equippedRelic ? 'Unequip current first' : 'Equip'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
