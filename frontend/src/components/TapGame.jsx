import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import BossCard from './BossCard';
import OfflineModal from './OfflineModal';

export default function TapGame({ user, onCoinsEarned, onAchievements }) {
  const [profile, setProfile] = useState(null);
  const [energy, setEnergy] = useState(1000);
  const [energyMax, setEnergyMax] = useState(1000);
  const [combo, setCombo] = useState(1);
  const [floats, setFloats] = useState([]);
  const [offlineBP, setOfflineBP] = useState(0);
  const [tapping, setTapping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prestiging, setPrestiging] = useState(false);

  const pendingTaps = useRef(0);
  const lastTapAt = useRef(0);
  const comboTimer = useRef(null);
  const flushTimer = useRef(null);
  const floatId = useRef(0);
  const tapAreaRef = useRef(null);

  // Keep latest callbacks in refs so timers always call current version
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

  // Real-time energy regen
  useEffect(() => {
    if (!profile) return;
    const interval = setInterval(() => {
      setEnergy((e) => Math.min(energyMax, e + profile.regenRate));
    }, 1000);
    return () => clearInterval(interval);
  }, [profile, energyMax]);

  // Flush pending taps to server
  const flush = () => {
    const count = pendingTaps.current;
    if (count === 0) return;
    pendingTaps.current = 0;
    api.tapper.tap(count).then((res) => {
      setEnergy(res.energy);
      if (res.bpEarned > 0) onCoinsRef.current?.(res.bpEarned);
      if (res.unlockedAchievements?.length) onAchRef.current?.(res.unlockedAchievements);
    }).catch(() => {});
  };

  const handleTap = (e) => {
    const multiTap = profile?.multiTap || 1;
    const tapPower = profile?.tapPower || 1;
    const energyCost = Math.min(multiTap, energy);
    if (energyCost === 0) return;

    // Combo
    const now = Date.now();
    const newCombo = (now - lastTapAt.current < 700)
      ? Math.min(combo + 0.15, 5)
      : 1;
    setCombo(newCombo);
    lastTapAt.current = now;

    clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(1), 1200);

    // Floating +BP
    const rect = tapAreaRef.current?.getBoundingClientRect();
    const cx = rect ? e.clientX - rect.left : 80;
    const cy = rect ? e.clientY - rect.top : 80;
    const jx = cx + (Math.random() - 0.5) * 60;
    const jy = cy + (Math.random() - 0.5) * 30;
    const displayBP = Math.floor(energyCost * tapPower * newCombo);
    const id = ++floatId.current;
    setFloats((f) => [...f, { id, x: jx, y: jy, bp: displayBP }]);
    setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 900);

    setEnergy((e) => Math.max(0, e - energyCost));
    pendingTaps.current += energyCost;

    setTapping(true);
    setTimeout(() => setTapping(false), 80);

    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, 800);
  };

  // Flush on unmount
  useEffect(() => () => {
    clearTimeout(flushTimer.current);
    clearTimeout(comboTimer.current);
    if (pendingTaps.current > 0) {
      api.tapper.tap(pendingTaps.current).catch(() => {});
    }
  }, []);

  const handlePrestige = async () => {
    if (!window.confirm('Prestige resets all upgrades. Continue?')) return;
    setPrestiging(true);
    try {
      const res = await api.tapper.prestige();
      if (res.unlockedAchievements?.length) onAchRef.current?.(res.unlockedAchievements);
      const fresh = await api.tapper.me();
      setProfile(fresh);
      setEnergy(fresh.energy);
      setEnergyMax(fresh.energyMax);
    } catch (err) {
      alert(err.message || 'Cannot prestige yet');
    } finally {
      setPrestiging(false);
    }
  };

  if (loading) return <div className="tap-loading">Loading tapper...</div>;

  const energyPct = Math.max(0, Math.min(100, (energy / energyMax) * 100));
  const noEnergy = energy < 1;
  const showCombo = combo >= 1.3;
  const canPrestige = (profile?.totalTaps || 0) >= 1_000_000;

  return (
    <div className="tap-game">
      {offlineBP > 0 && (
        <OfflineModal bp={offlineBP} onClose={() => setOfflineBP(0)} />
      )}

      {showCombo && (
        <div className="combo-meter">
          <span className="combo-label">COMBO</span>
          <span className="combo-value">×{combo.toFixed(1)}</span>
        </div>
      )}

      {/* Main tap area */}
      <div ref={tapAreaRef} className={`tap-area${noEnergy ? ' tap-area--empty' : ''}`} onClick={handleTap}>
        <div className={`tap-brain${tapping ? ' tap-brain--active' : ''}${noEnergy ? ' tap-brain--dark' : ''}`}>
          🧠
        </div>
        <div className="tap-brain-ring" />
        {floats.map((fl) => (
          <div
            key={fl.id}
            className="tap-float"
            style={{ left: fl.x, top: fl.y }}
          >
            +{fl.bp}
          </div>
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

      {/* Stats row */}
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
