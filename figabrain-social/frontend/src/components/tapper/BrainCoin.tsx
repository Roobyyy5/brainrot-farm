import { useCallback, useRef, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  text: string;
  isCrit?: boolean;
}

interface Props {
  icon: string;
  tapPower: number;
  multiTap: number;
  comboMul: number;
  energy: number;
  onTap: () => void;
}

let pid = 0;

export function BrainCoin({ icon, tapPower, multiTap, comboMul, energy, onTap }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const spawnParticle = useCallback((x: number, y: number, bpPerClick: number, mul: number) => {
    const isCrit = mul >= 5;
    const text = isCrit ? `CRIT! +${(bpPerClick * mul).toFixed(1)}` : `+${(bpPerClick * mul).toFixed(1)}`;
    const id = ++pid;
    const spread = (Math.random() - 0.5) * 120;
    const spreadY = -40 - Math.random() * 60;

    setParticles((prev) => [
      ...prev.slice(-12),
      { id, x: x + spread, y: y + spreadY, text, isCrit },
    ]);
    setTimeout(() => setParticles((prev) => prev.filter((p) => p.id !== id)), 900);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (energy < multiTap) return;
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left : 0;
    const y = rect ? e.clientY - rect.top : 0;

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 100);

    onTap();
    spawnParticle(x, y, tapPower * multiTap, comboMul);
  }, [energy, multiTap, tapPower, comboMul, onTap, spawnParticle]);

  const depleted = energy < multiTap;

  return (
    <div
      ref={containerRef}
      className="relative select-none flex items-center justify-center"
      style={{ width: 240, height: 240 }}
    >
      {/* Glow ring */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-300 ${
          depleted
            ? "bg-brain-800/20"
            : "bg-brain-accent/10 shadow-[0_0_60px_rgba(124,92,255,0.3)]"
        }`}
      />

      {/* Outer pulse ring */}
      {!depleted && (
        <div className="absolute inset-0 rounded-full border-2 border-brain-accent/30 animate-[ping_2s_ease-in-out_infinite]" />
      )}

      {/* Brain button */}
      <button
        onPointerDown={handlePointerDown}
        disabled={depleted}
        className={`
          relative z-10 w-44 h-44 rounded-full flex items-center justify-center text-8xl
          transition-all duration-75 cursor-pointer select-none touch-none
          ${isPressed ? "scale-90" : "scale-100"}
          ${depleted
            ? "opacity-30 cursor-not-allowed bg-brain-800/50"
            : "bg-gradient-to-br from-brain-accent/20 to-brain-accent2/10 border-2 border-brain-accent/40 hover:border-brain-accent/70 active:scale-90 shadow-[0_0_30px_rgba(124,92,255,0.4)]"
          }
        `}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <span className={`drop-shadow-lg ${isPressed ? "blur-[1px]" : ""}`}>{icon}</span>
      </button>

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`
            absolute pointer-events-none font-black text-sm z-20
            animate-[floatUp_0.9s_ease-out_forwards]
            ${p.isCrit ? "text-yellow-400 text-xl" : "text-brain-point"}
          `}
          style={{ left: p.x, top: p.y, transform: "translateX(-50%)" }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
}
