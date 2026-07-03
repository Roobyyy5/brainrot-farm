import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function Crafting() {
  const t = useT();
  const [recipes, setRecipes] = useState([]);
  const [crafting, setCrafting] = useState(null);
  const [flash, setFlash] = useState(null);

  const load = () => api.crafting.list().then(d => setRecipes(d.recipes)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCraft = async (recipeKey) => {
    if (crafting) return;
    setCrafting(recipeKey);
    try {
      const r = await api.crafting.craft(recipeKey);
      setFlash(t('crafting_crafted', { icon: r.crafted.icon, name: r.crafted.name }));
      setTimeout(() => setFlash(null), 2000);
      load();
    } catch (err) { alert(err.message); }
    finally { setCrafting(null); }
  };

  if (!recipes.length) return null;

  return (
    <div className="crafting-section">
      <div className="crafting-header">{t('crafting_header')}</div>
      <div className="crafting-sub">{t('crafting_sub')}</div>
      {flash && <div className="crafting-flash">{flash}</div>}
      <div className="crafting-list">
        {recipes.map(r => (
          <div key={r.key} className={`crafting-recipe${r.canCraft ? '' : ' crafting-recipe--locked'}`}>
            <div className="crafting-recipe-inputs">
              {r.inputs.map(inp => (
                <div key={inp.key} className="crafting-inp">
                  <span>{inp.icon}</span>
                  <span className={inp.have >= inp.qty ? 'crafting-have' : 'crafting-lack'}>
                    {inp.have}/{inp.qty}
                  </span>
                </div>
              ))}
            </div>
            <div className="crafting-arrow">→</div>
            <div className="crafting-output">
              <span className="crafting-out-icon">{r.output.icon}</span>
              <span className="crafting-out-name">{(() => { const k = 'item_' + r.output.key + '_name'; const v = t(k); return v === k ? r.output.name : v; })()}</span>
              {r.output.qty > 1 && <span className="crafting-out-qty">×{r.output.qty}</span>}
            </div>
            <button
              className="crafting-btn"
              onClick={() => handleCraft(r.key)}
              disabled={!r.canCraft || crafting === r.key}
            >
              {crafting === r.key ? '...' : t('crafting_btn')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
