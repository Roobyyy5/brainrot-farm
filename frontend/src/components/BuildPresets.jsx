import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const SLOT_ICONS = ['⚔️', '🛡️', '⚡'];

export default function BuildPresets() {
  const t = useT();
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
      <div className="buildpresets-header">{t('preset_header')}</div>
      <div className="buildpresets-sub">{t('preset_sub')}</div>

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
                      placeholder={t('preset_ph')}
                      autoFocus
                      maxLength={32}
                    />
                  ) : (
                    <div className="buildpreset-name">{preset.name}</div>
                  )}
                  <div className="buildpreset-meta">
                    {t('preset_tap_lv', { n: preset.data?.upgrades?.tapPower ?? '?' })} •
                    {t('preset_meta_pet', { name: preset.data?.pet || t('preset_none') })} •
                    {t('preset_meta_arts', { n: Object.keys(preset.data?.artifacts || {}).length })}
                  </div>
                  <div className="buildpreset-saved">{t('preset_saved', { date: new Date(preset.savedAt).toLocaleDateString() })}</div>
                </div>
              ) : (
                <div className="buildpreset-info">
                  {isEditing ? (
                    <input
                      className="buildpreset-name-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder={t('preset_ph')}
                      autoFocus
                      maxLength={32}
                    />
                  ) : (
                    <div className="buildpreset-empty">{t('preset_empty')}</div>
                  )}
                </div>
              )}

              <div className="buildpreset-actions">
                {isEditing ? (
                  <>
                    <button className="buildpreset-btn buildpreset-btn--save" onClick={() => savePreset(slot)} disabled={loading}>
                      {t('preset_save')}
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
                      {preset ? t('preset_overwrite') : t('preset_snapshot')}
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
