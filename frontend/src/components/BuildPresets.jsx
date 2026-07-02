import { useState, useEffect } from 'react';
import { api } from '../api';

const SLOT_ICONS = ['⚔️', '🛡️', '⚡'];

export default function BuildPresets() {
  const [presets, setPresets] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [editName, setEditName] = useState('');

  const load = () => api.buildpresets.list().then(d => {
    const arr = [null, null, null];
    for (const p of d.presets || []) arr[p.slot - 1] = p;
    setPresets(arr);
  }).catch(() => {});

  useEffect(() => { load(); }, []);

  const savePreset = async (slot) => {
    setLoading(true);
    try {
      await api.buildpresets.save(slot, editName || `Preset ${slot}`);
      setEditSlot(null);
      await load();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const deletePreset = async (slot) => {
    setLoading(true);
    try { await api.buildpresets.delete(slot); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="buildpresets-panel">
      <div className="buildpresets-header">🗂️ Build Presets</div>
      <div className="buildpresets-sub">Save your current upgrade/artifact/pet setup to switch instantly.</div>

      <div className="buildpresets-list">
        {presets.map((preset, i) => {
          const slot = i + 1;
          const isEditing = editSlot === slot;

          return (
            <div key={slot} className="buildpreset-card">
              <div className="buildpreset-slot-icon">{SLOT_ICONS[i]}</div>

              {preset ? (
                <div className="buildpreset-info">
                  {isEditing ? (
                    <input
                      className="buildpreset-name-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Preset name..."
                      autoFocus
                      maxLength={32}
                    />
                  ) : (
                    <div className="buildpreset-name">{preset.name}</div>
                  )}
                  <div className="buildpreset-meta">
                    Tap Lv {preset.data?.upgrades?.tapPower ?? '?'} •
                    Pet: {preset.data?.pet || 'none'} •
                    Artifacts: {Object.keys(preset.data?.artifacts || {}).length}/4
                  </div>
                  <div className="buildpreset-saved">Saved {new Date(preset.savedAt).toLocaleDateString()}</div>
                </div>
              ) : (
                <div className="buildpreset-info">
                  {isEditing ? (
                    <input
                      className="buildpreset-name-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Preset name..."
                      autoFocus
                      maxLength={32}
                    />
                  ) : (
                    <div className="buildpreset-empty">Empty slot</div>
                  )}
                </div>
              )}

              <div className="buildpreset-actions">
                {isEditing ? (
                  <>
                    <button className="buildpreset-btn buildpreset-btn--save" onClick={() => savePreset(slot)} disabled={loading}>
                      💾 Save
                    </button>
                    <button className="buildpreset-btn buildpreset-btn--cancel" onClick={() => setEditSlot(null)}>
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="buildpreset-btn buildpreset-btn--snap"
                      onClick={() => { setEditSlot(slot); setEditName(preset?.name || `Preset ${slot}`); }}
                      disabled={loading}
                    >
                      {preset ? '🔄 Overwrite' : '📸 Snapshot'}
                    </button>
                    {preset && (
                      <button className="buildpreset-btn buildpreset-btn--del" onClick={() => deletePreset(slot)} disabled={loading}>
                        🗑
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
