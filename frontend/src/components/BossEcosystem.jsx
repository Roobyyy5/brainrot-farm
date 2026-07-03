import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useT } from '../context/LangContext';

const TYPE_COLOR = {
  fire:      '#ef4444',
  void:      '#8b5cf6',
  ice:       '#60a5fa',
  lightning: '#f59e0b',
  arcane:    '#a78bfa',
};

export default function BossEcosystem() {
  const t = useT();
  const [bosses, setBosses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    api.bossecosystem.list()
      .then(d => setBosses(d.bosses || []))
      .catch(() => {})
      .finally(() => setInitLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useWebSocket({
    rooms: bosses.filter(b => b.alive).map(b => `bosseco:${b.key}`),
    onMessage: (msg) => {
      if (msg.type === 'boss_eco_hp') {
        setBosses(prev => prev.map(b => b.key === msg.bossKey
          ? { ...b, hp: msg.hp, hpPct: msg.maxHp > 0 ? msg.hp / msg.maxHp : 0 }
          : b
        ));
      }
      if (msg.type === 'boss_eco_killed') {
        setBosses(prev => prev.map(b => b.key === msg.bossKey ? { ...b, hp: 0, alive: false } : b));
      }
    },
  });

  const tap = async (key) => {
    setLoading(true);
    try {
      const r = await api.bossecosystem.tap(key, 30);
      await load();
      if (r.lootEarned) alert(t('beco_slain'));
      else if (r.hasWeakness) alert(t('beco_weakness_hit', { n: r.damageMult }));
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const fmt = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="bosseco-panel">
      <div className="bosseco-header">{t('beco_header')}</div>
      <div className="bosseco-sub">{t('beco_sub')}</div>

      <div className="bosseco-list">
        {initLoading && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-faint)' }}>{t('loading')}</div>}
        {bosses.map(boss => {
          const color = TYPE_COLOR[boss.type] || '#888';
          const isSelected = selected === boss.key;
          return (
            <div
              key={boss.key}
              className={`bosseco-card ${!boss.alive ? 'dead' : ''} ${isSelected ? 'selected' : ''}`}
              style={{ borderColor: boss.alive ? color : 'var(--border)' }}
              onClick={() => setSelected(isSelected ? null : boss.key)}
            >
              <div className="bosseco-card-top">
                <span className="bosseco-icon" style={{ filter: boss.alive ? 'none' : 'grayscale(1)' }}>{boss.icon}</span>
                <div className="bosseco-info">
                  <div className="bosseco-name">{boss.name}</div>
                  <div className="bosseco-type" style={{ color }}>
                    {t('boss_type_' + boss.type)} • {t('beco_weak', { n: t('boss_weak_' + boss.weakness) })}
                  </div>
                </div>
                <div className="bosseco-status">
                  {boss.alive ? (
                    <span className="bosseco-alive" style={{ color }}>{t('beco_alive')}</span>
                  ) : (
                    <span className="bosseco-dead">
                      {boss.respawnInMs > 0 ? `⏳ ${fmt(boss.respawnInMs)}` : t('beco_respawning')}
                    </span>
                  )}
                </div>
              </div>

              {boss.alive && (
                <div className="bosseco-hp-wrap">
                  <div className="bosseco-hp-bar">
                    <div className="bosseco-hp-fill" style={{ width: `${(boss.hpPct * 100).toFixed(1)}%`, background: color }} />
                  </div>
                  <div className="bosseco-hp-text">
                    {boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()} HP
                  </div>
                </div>
              )}

              {isSelected && (
                <div className="bosseco-detail">
                  <div className="bosseco-weakness-note">
                    {t('beco_weakness_note', { items: boss.weaknessArtifacts.join(' or ') })}
                  </div>
                  <div className="bosseco-loot">
                    {t('beco_loot', { gems: boss.lootGems, arts: boss.lootArtifacts.join(', ') })}
                  </div>
                  {boss.myDamage > 0 && (
                    <div className="bosseco-mydmg">{t('bosscard_my_dmg', { n: boss.myDamage.toLocaleString() })}</div>
                  )}
                  {boss.alive && (
                    <button className="bosseco-tap-btn" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
                      onClick={(e) => { e.stopPropagation(); tap(boss.key); }} disabled={loading}>
                      {t('beco_attack')}
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
