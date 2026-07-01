import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import BossCard from './BossCard';
import OfflineModal from './OfflineModal';

const PARTICLE_COLORS = ['#ff4fa3', '#8b5cf6', '#00e5ff', '#f5c344', '#34d399'];
const RANK_DATA = [
  { name: 'Bronze',  emoji: '🥉', minTaps: 0,       color: '#cd7f32' },
  { name: 'Silver',  emoji: '🥈', minTaps: 1000,    color: '#c0c5ce' },
  { name: 'Gold',    emoji: '🥇', minTaps: 10000,   color: '#f5c344' },
  { name: 'Diamond', emoji: '💎', minTaps: 100000,  color: '#00e5ff' },
  { name: 'Legend',  emoji: '🧠', minTaps: 500000,  color: '#ff4fa3' },
];

function getRank(totalTaps) {
  let rank = RANK_DATA[0];
  for (const r of RANK_DATA) { if (totalTaps >= r.minTaps) rank = r; }
  return rank;
}

function haptic(style = 'medium') {
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style); } catch {}
}

export default function TapGame({ user, onCoinsEarned, onAchievements }) {
  const [profile, setProfile] = useState(null);
  const [energy, setEnergy] = useState(1000);
  const [energyMax, setEnergyMax] = useState(1000);
  const [combo, setCombo] = useState(1);
  const [floats, setFloats] = useState([]);
  const [particles, setParticles] = useState([]);
  const [offlineBP, setOfflineBP] = useState(0);
  const [tapping, setTapping] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prestiging, setPrestiging] = useState(false);

  const pendingTaps = useRef(0);
  const lastTapAt = useRef(0);
  const comboTimer = useRef(null);
  const flushTimer = useRef(null);
  const floatId = useRef(0);
  const particleId = useRef(0);
  const tapAreaRef = useRef(null);

  const onCoinsRef = useRef(onCoinsEarned);
  const onAchRef = useRef(onAchievements);
  useEffect(() => { onCoinsRef.current = onCoinsEarned; }, [onCoinsEarned]);
  useEffect(() => { onAchRef.current = onAchievements; }, [onAchievements]);

  useEffect(() => {
    api.tapper.me().then((data) => {
      setProfile(data);
      setEnergy(data.energy);
      setEnergyMax(data.energyMax);
      if (data.offlineBP > 0) setOfflineBP(data.offlineBP);
    }).finally(() => setLoading(false));
  }, []);

  // Energy regen
  useEffect(() => {
    if (!profile) return;
    const iv = setInterval(() => {
      setEnergy((e) => Math.min(energyMax, e + profile.regenRate));
    }, 1000);
    return () => clearInterval(iv);
  }, [profile, energyMax]);

  const flush = () => {
    const count = pendingTaps.current;
    if (!count) return;
    pendingTaps.current = 0;
    api.tapper.tap(count).then((res) => {
      setEnergy(res.energy);
      if (res.bpEarned > 0) onCoinsRef.current?.(res.bpEarned);
      if (res.unlockedAchievements?.length) onAchRef.current?.(res.unlockedAchievements);
      if (res.isCrit) {
        haptic('heavy');
        setShaking(true);
        setTimeout(() => setShaking(false), 350);
      }
    }).catch(() => {});
  };

  const handleTap = (e) => {
    const multiTap = profile?.multiTap || 1;
    const tapPower = profile?.tapPower || 1;
    const energyCost = Math.min(multiTap, energy);
    if (energyCost === 0) { haptic('soft'); return; }

    haptic('medium');

    // Combo
    const now = Date.now();
    const newCombo = (now - lastTapAt.current < 700) ? Math.min(combo + 0.15, 5) : 1;
    setCombo(newCombo);
    lastTapAt.current = now;
    clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(1), 1200);

    // Position
    const rect = tapAreaRef.current?.getBoundingClientRect();
    const cx = rect ? e.clientX - rect.left : 110;
    const cy = rect ? e.clientY - rect.top : 110;

    // Floating number
    const bp = Math.floor(energyCost * tapPower * newCombo);
    const fid = ++floatId.current;
    setFloats((f) => [...f, { id: fid, x: cx + (Math.random() - 0.5) * 50, y: cy + (Math.random() - 0.5) * 20, bp }]);
    setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== fid)), 900);

    // Particles burst
    const newParticles = Array.from({ length: 8 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 70;
      const pid = ++particleId.current;
      return {
        id: pid,
        x: cx, y: cy,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      };
    });
    setParticles((p) => [...p, ...newParticles]);
    setTimeout(() => setParticles((p) => p.filter((pt) => !newParticles.some((np) => np.id === pt.id))), 650);

    setEnergy((e) => Math.max(0, e - energyCost));
    pendingTaps.current += energyCost;
    setTapping(true);
    setTimeout(() => setTapping(false), 80);
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, 800);
  };

  useEffect(() => () => {
    clearTimeout(flushTimer.current);
    clearTimeout(comboTimer.current);
    if (pendingTaps.current > 0) api.tapper.tap(pendingTaps.current).catch(() => {});
  }, []);

  const handlePrestige = async () => {
    if (!window.confirm('Prestige resets all upgrades but keeps your glory. Continue?')) return;
    setPrestiging(true);
    try {
      const res = await api.tapper.prestige();
      if (res.unlockedAchievements?.length) onAchRef.current?.(res.unlockedAchievements);
      const fresh = await api.tapper.me();
      setProfile(fresh);
      setEnergy(fresh.energy);
      setEnergyMax(fresh.energyMax);
    } catch (err) { alert(err.message || 'Cannot prestige yet'); }
    finally { setPrestiging(false); }
  };

  if (loading) return <div className="tap-loading">Loading tapper...</div>;

  const energyPct = Math.max(0, Math.min(100, (energy / energyMax) * 100));
  const noEnergy = energy < 1;
  const showCombo = combo >= 1.3;
  const rank = getRank(profile?.totalTaps || 0);
  const canPrestige = (profile?.totalTaps || 0) >= 1_000_000;

  return (
    <div className={`tap-game${shaking ? ' tap-game--shaking' : ''}`}>
      {offlineBP > 0 && (
        <OfflineModal bp={offlineBP} onClose={() => setOfflineBP(0)} />
      )}

      {/* Rank badge */}
      <div className="rank-badge" style={{ borderColor: rank.color, color: rank.color }}>
        {rank.emoji} {rank.name}
        {profile?.cardIncomePerHour > 0 && (
          <span className="rank-passive"> · +{profile.cardIncomePerHour}/hr</span>
        )}
      </div>

      {showCombo && (
        <div className="combo-meter">
          <span className="combo-label">COMBO</span>
          <span className="combo-value">×{combo.toFixed(1)}</span>
        </div>
      )}

      {/* Tap area */}
      <div
        ref={tapAreaRef}
        className={`tap-area${noEnergy ? ' tap-area--empty' : ''}`}
        onClick={handleTap}
      >
        <div className={`tap-brain${tapping ? ' tap-brain--active' : ''}${noEnergy ? ' tap-brain--dark' : ''}`}>
          {profile?.prestige > 0 ? '🧠' : '🧠'}
        </div>
        <div className="tap-brain-ring" />

        {/* Floating BP numbers */}
        {floats.map((fl) => (
          <div key={fl.id} className="tap-float" style={{ left: fl.x, top: fl.y }}>
            +{fl.bp}
          </div>
        ))}

        {/* Particle burst */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="tap-particle"
            style={{
              left: p.x,
              top: p.y,
              background: p.color,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
            }}
          />
        ))}
      </div>

      {/* Energy bar */}
      <div className="energy-bar-wrap">
        <div className="energy-bar-header">
          <span className="energy-label">⚡ {energy} / {energyMax}</span>
          <span className="energy-regen">+{profile?.regenRate}/s</span>
        </div>
        <div className="energy-bar-track">
          <div className="energy-bar-fill" style={{ width: `${energyPct}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="tap-stats">
        <div className="tap-stat">
          <span className="tap-stat-value">{(profile?.totalTaps || 0).toLocaleString()}</span>
          <span className="tap-stat-label">Total Taps</span>
        </div>
        <div className="tap-stat">
          <span className="tap-stat-value">⚡{profile?.tapPower || 1}</span>
          <span className="tap-stat-label">Power</span>
        </div>
        <div className="tap-stat">
          <span className="tap-stat-value">✨{profile?.prestige || 0}</span>
          <span className="tap-stat-label">Prestige</span>
        </div>
      </div>

      {canPrestige && (
        <button className="prestige-btn" onClick={handlePrestige} disabled={prestiging}>
          ✨ PRESTIGE (reset upgrades, keep glory)
        </button>
      )}

      {profile?.boss && (
        <BossCard
          boss={profile.boss}
          tapPower={profile.tapPower || 1}
          multiTap={profile.multiTap || 1}
          energy={energy}
          onDamage={(dmg, killed) => {
            haptic('heavy');
            setEnergy((e) => Math.max(0, e - dmg));
            setProfile((p) => p ? {
              ...p,
              boss: killed ? null : { ...p.boss, hp: Math.max(0, p.boss.hp - dmg * (profile.tapPower || 1)) },
            } : p);
            if (killed) onCoinsRef.current?.(profile.boss.reward);
          }}
        />
      )}
    </div>
  );
}
