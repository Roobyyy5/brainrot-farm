interface Props {
  combo: number;
  multiplier: number;
}

export function ComboMeter({ combo, multiplier }: Props) {
  if (combo === 0) return null;

  const isFire = multiplier >= 3;
  const isHot = multiplier >= 2;

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black border transition-all
        ${isFire
          ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          : isHot
          ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
          : "bg-brain-accent/15 border-brain-accent/30 text-brain-accent"
        }
      `}
    >
      <span>{isFire ? "🔥" : isHot ? "⚡" : "✨"}</span>
      <span>{combo}× combo</span>
      {multiplier > 1 && (
        <span className="text-xs opacity-80">x{multiplier} BP</span>
      )}
    </div>
  );
}
