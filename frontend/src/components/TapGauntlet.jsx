import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const SESSION_MS = 45000;
const BASE_HP = 10000;
const HP_SCALE = 1.22;

export default function TapGauntlet() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('menu');
  const [wave, setWave] = useState(1);
  const [bossHp, setBossHp] = useState(BASE_HP);
  const [bossMaxHp, setBossMaxHp] = useState(BASE_HP);
  const [totalDmg, setTotalDmg] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SESSION_MS / 1000);
  const [taps, setTaps] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const waveRef = useRef(1);
  const dmgRef = useRef(0);

  const load = () => api.gauntlet.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const getWaveColor = (w) => {
    const colors = ['#9ca3af','#34d399','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ff4fa3'];
    return colors[Math.min(Math.floor((w - 1) / 10), colors.length - 1)];
  };

  const startGauntlet = () => {
    const hp = BASE_HP;
    setWave(1); waveRef.current = 1;
    setBossHp(hp); setBossMaxHp(hp);
    setTotalDmg(0); dmgRef.current = 0;
    setTaps(0);
    setTimeLeft(SESSION_MS / 1000);
    setView('playing');

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); finishGauntlet(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const finishGauntlet = async () => {
    clearInterval(timerRef.current);
    setView('result');
    setLoading(true);
    try {
      const r = await api.gauntlet.submit(waveRef.current - 1, dmgRef.current);
      if (r.gems > 0 || r.newTitles?.length > 0) {
        await load();
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const tapBoss = () => {
    const dmg = 10 + wave * 2;
    const newHp = Math.max(0, bossHp - dmg);
    setTaps(t => t + 1);
    setTotalDmg(d => { dmgRef.current = d + dmg; return d + dmg; });

    if (newHp <= 0) {
      // Next wave
      const nextWave = wave + 1;
      const nextHp = Math.floor(BASE_HP * Math.pow(HP_SCALE, nextWave - 1));
      setWave(nextWave); waveRef.current = nextWave;
      setBossMaxHp(nextHp);
      setBossHp(nextHp);
    } else {
      setBossHp(newHp);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  if (!data) return null;

  const hpPct = bossMaxHp > 0 ? (bossHp / bossMaxHp) * 100 : 0;
  const waveColor = getWaveColor(wave);
  const milestone = data.config?.milestones?.findLast?.(m => wave > m.wave) || null;

  return (
    <div className="gauntlet-panel">
      <div className="gauntlet-header">⚔️ Tap Gauntlet</div>

      {view === 'menu' && (
        <>
          <div className="gauntlet-desc">Нескінченні хвилі босів — кожна на 22% сильніша. Скільки протримаєшся за 45с?</div>
          {data.best && (
            <div className="gauntlet-best">🏆 Рекорд: Хвиля <b>{data.best.waves}</b> • {(data.best.totalDamage / 1000).toFixed(0)}k урону</div>
          )}
          {data.titles?.length > 0 && (
            <div className="gauntlet-titles">{data.titles.map(t => <span key={t} className="gauntlet-title-badge">{t}</span>)}</div>
          )}
          <div className="gauntlet-milestones">
            {data.config?.milestones?.map(m => (
              <div key={m.wave} className={`gauntlet-ms ${(data.best?.waves || 0) >= m.wave ? 'reached' : ''}`}>
                <span>Хвиля {m.wave}</span>
                <span>💎 {m.reward.gems}{m.reward.title ? ` + "${m.reward.title}"` : ''}</span>
              </div>
            ))}
          </div>
          <button className="gauntlet-start-btn" onClick={startGauntlet}>⚔️ Почати Gauntlet</button>

          {data.leaderboard?.length > 0 && (
            <div className="gauntlet-lb">
              <div className="gauntlet-lb-title">🏅 Leaderboard</div>
              {data.leaderboard.slice(0, 10).map(r => (
                <div key={r.rank} className={`gauntlet-lb-row ${r.isMe ? 'me' : ''}`}>
                  <span className="gauntlet-lb-rank">{r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`}</span>
                  <span className="gauntlet-lb-name">{r.username}</span>
                  <span className="gauntlet-lb-waves">Хв. {r.waves}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'playing' && (
        <div className="gauntlet-fight">
          <div className="gauntlet-hud">
            <span className="gauntlet-wave" style={{ color: waveColor }}>Хвиля {wave}</span>
            <span className="gauntlet-timer">⏱ {timeLeft}с</span>
            <span className="gauntlet-dmg">{(totalDmg / 1000).toFixed(1)}k урону</span>
          </div>
          <div className="gauntlet-hp-bar">
            <div className="gauntlet-hp-fill" style={{ width: `${hpPct}%`, background: waveColor }} />
          </div>
          <div className="gauntlet-hp-text">{bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()} HP</div>
          <button className="gauntlet-tap-btn" style={{ borderColor: waveColor }} onClick={tapBoss}>
            ⚔️ ТАП! ({taps})
          </button>
        </div>
      )}

      {view === 'result' && (
        <div className="gauntlet-result">
          <div className="gauntlet-result-wave" style={{ color: getWaveColor(wave) }}>Хвиля {wave - 1}</div>
          <div className="gauntlet-result-dmg">{(totalDmg / 1000).toFixed(1)}k загального урону</div>
          {milestone && <div className="gauntlet-result-ms">✅ {milestone.wave}+ milestone досягнуто!</div>}
          <button className="gauntlet-start-btn" onClick={startGauntlet}>🔄 Знову</button>
          <button className="gauntlet-back-btn" onClick={() => setView('menu')}>← Меню</button>
        </div>
      )}
    </div>
  );
}
