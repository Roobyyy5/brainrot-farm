import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

const TIER_COLOR = { 1: '#9ca3af', 2: '#3b82f6', 3: '#f59e0b' };

export default function GuildForge() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contributeAmt, setContributeAmt] = useState('');

  const load = () => api.guildforge.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const forge = async (recipeKey) => {
    setLoading(true);
    try {
      const r = await api.guildforge.forge(recipeKey);
      await load();
      toastSuccess(t('forge_forged', { name: r.recipe, time: new Date(r.expiresAt).toLocaleTimeString() }));
    } catch (err) { toastError(err.message); }
    finally { setLoading(false); }
  };

  const contribute = async () => {
    const amt = Number(contributeAmt);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try { await api.guildforge.contribute(amt); await load(); setContributeAmt(''); }
    catch (err) { toastError(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const isOfficer = ['owner', 'officer'].includes(data.role);

  return (
    <div className="forge-panel">
      <div className="forge-header">{t('forge_header')}</div>

      <div className="forge-info">
        <div className="forge-level">
          <span className="forge-level-num">{t('forge_level', { n: data.forgeLevel })}</span>
          <span className="forge-xp">{t('forge_xp', { xp: data.forgeXp, next: data.nextLevelXp || '∞' })}</span>
        </div>
        <div className="forge-guild-coins">{t('forge_coins', { n: Number(data.guildCoins).toLocaleString() })}</div>
      </div>

      {data.activeBoosts?.length > 0 && (
        <div className="forge-active">
          <div className="forge-active-title">{t('forge_active_title')}</div>
          {data.activeBoosts.map(b => {
            const recipe = data.allRecipes?.find(r => r.key === b.recipeKey);
            const left = Math.max(0, Math.ceil((b.expiresAt - Date.now()) / 60000));
            return (
              <div key={b.recipeKey} className="forge-active-item">
                <span>{recipe?.icon} {recipe ? (() => { const k = 'forge_' + recipe.key + '_name'; const v = t(k); return v === k ? recipe.name : v; })() : ''}</span>
                <span className="forge-active-time">{t('forge_time_left', { n: left })}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="forge-recipes">
        {data.recipes?.map(recipe => {
          const active = data.activeBoosts?.find(b => b.recipeKey === recipe.key);
          const color = TIER_COLOR[recipe.tier] || '#888';
          return (
            <div key={recipe.key} className={`forge-recipe ${active ? 'active' : ''}`} style={{ borderColor: color }}>
              <div className="forge-recipe-top">
                <span className="forge-recipe-icon">{recipe.icon}</span>
                <div>
                  <div className="forge-recipe-name" style={{ color }}>{(() => { const k = 'forge_' + recipe.key + '_name'; const v = t(k); return v === k ? recipe.name : v; })()}</div>
                  <div className="forge-recipe-desc">{(() => { const k = 'forge_' + recipe.key + '_desc'; const v = t(k); return v === k ? recipe.desc : v; })()}</div>
                </div>
              </div>
              <div className="forge-recipe-cost">
                {t('forge_cost_coins', { n: Number(recipe.cost.coins).toLocaleString() })}
                {recipe.cost.guild_xp ? ` • ${recipe.cost.guild_xp} XP` : ''}
              </div>
              {isOfficer ? (
                <button
                  className="forge-btn"
                  style={{ borderColor: color, color }}
                  onClick={() => forge(recipe.key)}
                  disabled={loading || !!active || Number(data.guildCoins) < recipe.cost.coins}
                >
                  {active ? t('forge_active_badge') : t('forge_btn')}
                </button>
              ) : (
                <div className="forge-officer-only">{t('forge_officer_only')}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="forge-contribute">
        <div className="forge-contribute-title">{t('forge_contribute_title')}</div>
        <div className="forge-contribute-row">
          <input
            className="forge-contribute-input"
            type="number"
            min="1"
            value={contributeAmt}
            onChange={e => setContributeAmt(e.target.value)}
            placeholder={t('forge_contribute_ph')}
          />
          <button className="forge-contribute-btn" onClick={contribute} disabled={loading || !contributeAmt}>
            {t('forge_contribute_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
