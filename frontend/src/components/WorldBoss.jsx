import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';

const PHASE_CONFIG = {
  normal:     { label: 'Normal',      color: '#34d399', icon: '🟢' },
  rage:       { label: '⚠️ RAGE',     color: '#ef4444', icon: '🔴' },
  vulnerable: { label: '✨ VULNERABLE ×3!', color: '#f59e0b', icon: '⭐' },
};

export default function WorldBoss() {
  const [data, setData] = useState(null);
  const [liveHp, setLiveHp] = useState(null);
  const [livePct, setLivePct] = useState(null);
  const [livePhase, setLivePhase] = useState(null);
  const [liveVulnUntil, setLiveVulnUntil] = useState(0);
  const [tapping, setTapping] = useState(false);
  const [countdown, setCountdown] = useState('');
  const timerRef = useRef(null);
  const vulnTimerRef = useRef(null);
  const [vulnLeft, setVulnLeft] = useState(0);

  const load = () => api.worldboss.status().then(d => {
    setData(d);
    setLiveHp(d.boss?.hp ?? null);
    setLivePct(d.boss?.pct ?? null);
    setLivePhase(d.boss?.phase ?? null);
    setLiveVulnUntil(d.boss?.vulnUntil ?? 0);
  }).catch(() => {});

  useEffect(() => { load(); }, []);

  const bossId = data?.boss?.id;
  const rooms = useMemo(() => bossId ? [`worldboss:${bossId}`] : [], [bossId]);

  useWebSocket({
    rooms,
    onMessage: (msg) => {
      if (msg.type === 'boss_hp') {
        setLiveHp(msg.hp);
        setLivePct(msg.pct);
        setLivePhase(msg.phase);
        setLiveVulnUntil(msg.vulnUntil || 0);
      }
    },
  });

  useEffect(() => {
    if (!data?.boss) return;
    clearInterval(timerRef.current);
    const tick = () => {
      const ms = Math.max(0, data.boss.endsAt - Date.now());
      const d  = Math.floor(ms / 86400000);
      const h  = Math.floor((ms % 86400000) / 3600000);
      const m  = Math.floor((ms % 3600000) / 60000);
      setCountdown(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
      if (ms <= 0) { load(); clearInterval(timerRef.current); }
    };
    tick();
    timerRef.current = setInterval(tick, 30000);
    return () => clearInterval(timerRef.current);
  }, [data]);

  useEffect(() => {
    clearInterval(vulnTimerRef.current);
    if (liveVulnUntil <= Date.now()) { setVulnLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((liveVulnUntil - Date.now()) / 1000));
      setVulnLeft(left);
      if (left <= 0) clearInterval(vulnTimerRef.current);
    };
    tick();
    vulnTimerRef.current = setInterval(tick, 500);
    return () => clearInterval(vulnTimerRef.current);
  }, [liveVulnUntil]);

  const handleTap = async () => {
    if (tapping) return;
    setTapping(true);
    try { await api.worldboss.tap(10); }
    catch (err) { if (err.status !== 400) alert(err.message); }
    finally { setTapping(false); }
  };

  if (!data) return null;
  const { boss, myDamage, topHitters, topGems } = data;
  const hp  = liveHp  ?? boss?.hp;
  const pct = livePct ?? boss?.pct;
  const phase = livePhase ?? boss?.phase ?? 'normal';
  const phaseCfg = PHASE_CONFIG[phase] || PHASE_CONFIG.normal;

  return (
    <div className="worldboss-section">
      <div className="worldboss-header">🌍 World Boss</div>

      {boss.hp <= 0 ? (
        <div className="worldboss-dead">Boss defeated! A new boss will spawn soon.</div>
      ) : (
        <>
          <div className="worldboss-name">{boss.name}</div>

          <div className="worldboss-phase-badge" style={{ background: phaseCfg.color + '22', color: phaseCfg.color, border: `1px solid ${phaseCfg.color}` }}>
            {phaseCfg.icon} {phaseCfg.label}
            {phase === 'vulnerable' && vulnLeft > 0 && <span> — {vulnLeft}s</span>}
          </div>

          <div className="worldboss-hp-bar-wrap" style={{ borderColor: phaseCfg.color }}>
            <div className="worldboss-hp-bar" style={{ width: `${pct}%`, background: phaseCfg.color }} />
          </div>
          <div className="worldboss-hp-text">
            {Number(hp).toLocaleString()} / {Number(boss.maxHp).toLocaleString()} HP
          </div>
          <div className="worldboss-meta">
            <span>⏰ {countdown} left</span>
            <span>⚔️ My damage: {myDamage.toLocaleString()}</span>
            {phase === 'vulnerable' && <span className="worldboss-vuln-tag">⚡ TRIPLE DAMAGE!</span>}
          </div>
          <button
            className={`worldboss-tap-btn ${phase === 'vulnerable' ? 'worldboss-tap-btn--vuln' : ''}`}
            onClick={handleTap}
            disabled={tapping}
          >
            {tapping ? '...' : phase === 'vulnerable' ? '⚡ STRIKE NOW! (×30)' : '⚔️ ATTACK! (×10)'}
          </button>
        </>
      )}

      {topHitters?.length > 0 && (
        <div className="worldboss-lb">
          <div className="worldboss-lb-title">Top Attackers</div>
          {topHitters.map(r => (
            <div key={r.rank} className="worldboss-lb-row">
              <span className="worldboss-lb-rank">#{r.rank}</span>
              <span className="worldboss-lb-name">{r.username}</span>
              <span className="worldboss-lb-dmg">{Number(r.damage).toLocaleString()}</span>
              {topGems[r.rank - 1] > 0 && <span className="worldboss-lb-gems">💎{topGems[r.rank - 1]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
