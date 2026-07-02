import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const RARITY_COLOR = { common: '#9ca3af', rare: '#3b82f6', legendary: '#f59e0b' };
const ING_ICONS = { tap_shard: '🔷', energy_crystal: '💠', combo_dust: '✨', prestige_essence: '🌀' };

export default function TapAlchemy() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('brew');

  const load = () => api.alchemy.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const brew = async (recipeKey) => {
    setLoading(true);
    try {
      const r = await api.alchemy.brew(recipeKey);
      await load();
      let msg = t('alch_brewed', { name: r.recipe });
      if (r.expiresAt) msg += t('alch_brewed_until', { time: new Date(r.expiresAt).toLocaleTimeString() });
      alert(msg);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const canAfford = (cost) => Object.entries(cost).every(([mat, need]) => (data.ingredients[mat] || 0) >= need);

  return (
    <div className="alchemy-panel">
      <div className="alchemy-header">{t('alch_header')}</div>

      <div className="alchemy-ingredients">
        {Object.entries(data.ingredients).map(([key, val]) => (
          <div key={key} className="alchemy-ing">
            <span className="alchemy-ing-icon">{ING_ICONS[key]}</span>
            <span className="alchemy-ing-val">{val}</span>
          </div>
        ))}
      </div>

      {data.activeBrews?.length > 0 && (
        <div className="alchemy-active">
          <div className="alchemy-active-title">{t('alch_active_title')}</div>
          {data.activeBrews.map(b => {
            const recipe = data.recipes.find(r => r.key === b.recipeKey);
            const left = b.expiresAt ? Math.max(0, Math.ceil((b.expiresAt - Date.now()) / 1000)) : null;
            return (
              <div key={b.recipeKey} className="alchemy-active-item">
                <span>{recipe?.icon} {recipe?.name}</span>
                {left !== null && <span className="alchemy-active-timer">{Math.floor(left / 60)}:{String(left % 60).padStart(2,'0')}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="alchemy-tabs">
        {['common', 'rare', 'legendary'].map(r => (
          <button key={r} className={`alchemy-tab ${tab === r ? 'active' : ''}`} onClick={() => setTab(r)}>
            <span style={{ color: RARITY_COLOR[r] }}>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
          </button>
        ))}
      </div>

      <div className="alchemy-recipes">
        {data.recipes.filter(r => r.rarity === tab).map(recipe => {
          const affordable = canAfford(recipe.cost);
          const active = data.activeBrews?.find(b => b.recipeKey === recipe.key);
          return (
            <div key={recipe.key} className={`alchemy-recipe ${affordable ? 'can-brew' : ''} ${active ? 'active' : ''}`}
              style={{ borderColor: RARITY_COLOR[recipe.rarity] }}>
              <div className="alchemy-recipe-top">
                <span className="alchemy-recipe-icon">{recipe.icon}</span>
                <div className="alchemy-recipe-info">
                  <div className="alchemy-recipe-name">{recipe.name}</div>
                  <div className="alchemy-recipe-desc">{recipe.desc}</div>
                </div>
              </div>
              <div className="alchemy-cost">
                {Object.entries(recipe.cost).map(([mat, need]) => (
                  <span key={mat} className={`alchemy-cost-item ${(data.ingredients[mat] || 0) >= need ? 'ok' : 'lack'}`}>
                    {ING_ICONS[mat]} {need}
                  </span>
                ))}
              </div>
              <button
                className="alchemy-brew-btn"
                onClick={() => brew(recipe.key)}
                disabled={loading || !affordable || !!active}
                style={{ borderColor: RARITY_COLOR[recipe.rarity] }}
              >
                {active ? t('alch_active_badge') : affordable ? t('alch_brew_btn') : t('alch_locked')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
