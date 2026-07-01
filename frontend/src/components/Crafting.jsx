import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Crafting() {
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
      setFlash(`${r.crafted.icon} ${r.crafted.name} crafted!`);
      setTimeout(() => setFlash(null), 2000);
      load();
    } catch (err) { alert(err.message); }
    finally { setCrafting(null); }
  };

  if (!recipes.length) return null;

  return (
    <div className="crafting-section">
      <div className="crafting-header">⚗️ Crafting</div>
      <div className="crafting-sub">Combine inventory items into better ones.</div>
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
              <span className="crafting-out-name">{r.output.name}</span>
              {r.output.qty > 1 && <span className="crafting-out-qty">×{r.output.qty}</span>}
            </div>
            <button
              className="crafting-btn"
              onClick={() => handleCraft(r.key)}
              disabled={!r.canCraft || crafting === r.key}
            >
              {crafting === r.key ? '...' : 'Craft'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
