import { useState, useEffect } from 'react';
import { api } from '../api';

const TIER_COLOR = { 1: '#9ca3af', 2: '#3b82f6', 3: '#f59e0b' };

export default function GuildForge() {
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
      alert(`⚒️ Викуто: ${r.recipe}! Активне до ${new Date(r.expiresAt).toLocaleTimeString()}`);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const contribute = async () => {
    const amt = Number(contributeAmt);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try { await api.guildforge.contribute(amt); await load(); setContributeAmt(''); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const isOfficer = ['owner', 'officer'].includes(data.role);

  return (
    <div className="forge-panel">
      <div className="forge-header">⚒️ Guild Forge</div>

      <div className="forge-info">
        <div className="forge-level">
          <span className="forge-level-num">Рівень {data.forgeLevel}</span>
          <span className="forge-xp">{data.forgeXp} / {data.nextLevelXp || '∞'} XP</span>
        </div>
        <div className="forge-guild-coins">Монети гільдії: {Number(data.guildCoins).toLocaleString()}</div>
      </div>

      {data.activeBoosts?.length > 0 && (
        <div className="forge-active">
          <div className="forge-active-title">⚡ Активні бусти:</div>
          {data.activeBoosts.map(b => {
            const recipe = data.allRecipes?.find(r => r.key === b.recipeKey);
            const left = Math.max(0, Math.ceil((b.expiresAt - Date.now()) / 60000));
            return (
              <div key={b.recipeKey} className="forge-active-item">
                <span>{recipe?.icon} {recipe?.name}</span>
                <span className="forge-active-time">{left}хв залишилось</span>
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
                  <div className="forge-recipe-name" style={{ color }}>{recipe.name}</div>
                  <div className="forge-recipe-desc">{recipe.desc}</div>
                </div>
              </div>
              <div className="forge-recipe-cost">
                💰 {Number(recipe.cost.coins).toLocaleString()} монет гільдії
                {recipe.cost.guild_xp ? ` • ${recipe.cost.guild_xp} XP` : ''}
              </div>
              {isOfficer ? (
                <button
                  className="forge-btn"
                  style={{ borderColor: color, color }}
                  onClick={() => forge(recipe.key)}
                  disabled={loading || !!active || Number(data.guildCoins) < recipe.cost.coins}
                >
                  {active ? '✅ Активне' : '⚒️ Кувати'}
                </button>
              ) : (
                <div className="forge-officer-only">⚠️ Тільки офіцери</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="forge-contribute">
        <div className="forge-contribute-title">💰 Поповнити скарбницю гільдії</div>
        <div className="forge-contribute-row">
          <input
            className="forge-contribute-input"
            type="number"
            min="1"
            value={contributeAmt}
            onChange={e => setContributeAmt(e.target.value)}
            placeholder="Кількість монет"
          />
          <button className="forge-contribute-btn" onClick={contribute} disabled={loading || !contributeAmt}>
            Здати
          </button>
        </div>
      </div>
    </div>
  );
}
