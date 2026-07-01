import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const PRIZES = [
  { label: '50 BP',      color: '#f5c344', emoji: '🪙' },
  { label: '100 BP',     color: '#f5c344', emoji: '🪙' },
  { label: '250 BP',     color: '#f5c344', emoji: '🪙' },
  { label: '500 BP',     color: '#ff8c00', emoji: '💰' },
  { label: 'Full ⚡',    color: '#00e5ff', emoji: '⚡' },
  { label: '1K BP',      color: '#ff4fa3', emoji: '🔥' },
  { label: '2.5K BP',    color: '#8b5cf6', emoji: '💎' },
  { label: '5 Gems',     color: '#00ffaa', emoji: '✨' },
];

export default function WheelSpin({ onEarned }) {
  const [canSpin, setCanSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reelPos, setReelPos] = useState(0);
  const reelRef = useRef(null);

  useEffect(() => {
    api.wheel.status().then((d) => {
      setCanSpin(d.canSpin);
      setLoading(false);
    });
  }, []);

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    try {
      const res = await api.wheel.spin();
      const idx = res.prize.index ?? 0;
      const ITEM_H = 72;
      const totalItems = PRIZES.length * 5; // 5 repeats for reel
      // Land on the prize in the 4th repetition
      const targetPos = PRIZES.length * 3 * ITEM_H + idx * ITEM_H;

      // Start fast scroll, then decelerate to target
      if (reelRef.current) {
        reelRef.current.style.transition = 'none';
        reelRef.current.style.transform = `translateY(0)`;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (reelRef.current) {
            reelRef.current.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.05, 1)';
            reelRef.current.style.transform = `translateY(-${targetPos}px)`;
          }
        });
      });

      setTimeout(() => {
        setResult(res.prize);
        setCanSpin(false);
        setSpinning(false);
        if (res.prize.type === 'coins') onEarned?.(res.prize.value);
      }, 3200);
    } catch (err) {
      setSpinning(false);
      alert(err.message || 'Spin failed');
    }
  };

  if (loading) return null;

  return (
    <div className="wheel-section">
      <div className="wheel-header">
        <span className="wheel-title">🎡 Daily Spin</span>
        <span className="wheel-subtitle">{canSpin ? 'Free spin available!' : 'Come back tomorrow'}</span>
      </div>

      {/* Slot reel */}
      <div className="wheel-reel-wrap">
        <div className="wheel-reel-window">
          <div className="wheel-reel" ref={reelRef}>
            {[...Array(5)].flatMap((_, rep) =>
              PRIZES.map((p, i) => (
                <div
                  key={`${rep}-${i}`}
                  className="wheel-reel-item"
                  style={{ background: `${p.color}22`, borderColor: `${p.color}55` }}
                >
                  <span className="wheel-reel-emoji">{p.emoji}</span>
                  <span className="wheel-reel-label" style={{ color: p.color }}>{p.label}</span>
                </div>
              ))
            )}
          </div>
          <div className="wheel-reel-pointer" />
        </div>
      </div>

      {result && (
        <div className="wheel-result" style={{ borderColor: PRIZES[result.index]?.color }}>
          <span className="wheel-result-emoji">{PRIZES[result.index]?.emoji}</span>
          <span className="wheel-result-label">You won: {result.label}!</span>
        </div>
      )}

      <button
        className="wheel-spin-btn"
        onClick={handleSpin}
        disabled={!canSpin || spinning}
      >
        {spinning ? '🎡 Spinning...' : canSpin ? '🎡 Spin Now' : '✓ Spun Today'}
      </button>

      <div className="wheel-prizes-preview">
        {PRIZES.map((p, i) => (
          <div key={i} className="wheel-prize-chip" style={{ color: p.color }}>
            {p.emoji} {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}
