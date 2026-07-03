import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function RelicsPanel() {
  const t = useT();
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
      <div className="relics-header">{t('relics_header')}</div>
      <div className="relics-sub">
        {t('relics_sub')} {t('relics_current_asc', { n: data.ascensionCount })}
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
                  <div className="relic-name">{(() => { const k = 'relic_' + r.key + '_name'; const v = t(k); return v === k ? r.name : v; })()}</div>
                  <div className="relic-passive">{(() => { const k = 'relic_' + r.key + '_passive'; const v = t(k); return v === k ? r.passiveDesc : v; })()}</div>
                  <div className="relic-active">⚡ {(() => { const k = 'relic_' + r.key + '_active'; const v = t(k); return v === k ? r.activeDesc : v; })()}</div>
                  <div className="relic-cd-info">{t('relics_cd_info', { n: Math.round(r.activeCooldownMs / 60000) })}</div>
                </div>
                {!r.unlockable && (
                  <div className="relic-lock">{t('relics_lock', { n: r.requiredAscension })}</div>
                )}
                {r.unlockable && !r.owned && (
                  <button className="relic-btn relic-btn--grant" onClick={() => act(() => api.relics.grant(r.key))} disabled={loading}>
                    {t('relics_claim')}
                  </button>
                )}
              </div>

              {r.owned && (
                <div className="relic-actions">
                  {r.equipped ? (
                    <>
                      <span className="relic-equipped-badge">{t('relics_equipped')}</span>
                      {onCooldown ? (
                        <span className="relic-cooldown">{t('relics_cooldown_badge', { time: fmtCd })}</span>
                      ) : (
                        <button className="relic-btn relic-btn--activate" onClick={() => act(() => api.relics.activate(r.key))} disabled={loading}>
                          {t('relics_activate')}
                        </button>
                      )}
                      <button className="relic-btn relic-btn--unequip" onClick={() => act(() => api.relics.unequip())} disabled={loading}>
                        {t('relics_unequip')}
                      </button>
                    </>
                  ) : (
                    <button className="relic-btn relic-btn--equip" onClick={() => act(() => api.relics.equip(r.key))} disabled={loading || !!data.equippedRelic}>
                      {data.equippedRelic ? t('relics_equip_first') : t('relics_equip')}
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
