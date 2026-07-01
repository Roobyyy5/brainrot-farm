import { useTranslation } from "react-i18next";

interface Props {
  current: number;
  max: number;
  regenRate: number;
}

export function EnergyBar({ current, max, regenRate }: Props) {
  const { t } = useTranslation();
  const pct = Math.min(100, (current / max) * 100);
  const depleted = current < 1;

  let barColor = "from-brain-accent to-brain-accent2";
  if (pct < 20) barColor = "from-red-500 to-orange-500";
  else if (pct < 50) barColor = "from-orange-400 to-yellow-400";

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className={`font-semibold ${depleted ? "text-red-400" : "text-white/60"}`}>
          ⚡ {Math.floor(current).toLocaleString()} / {max.toLocaleString()}
        </span>
        <span className="text-white/30">+{regenRate}/sec</span>
      </div>

      <div className="h-3 bg-brain-800 rounded-full overflow-hidden border border-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {depleted && (
        <p className="text-center text-xs text-red-400/80 mt-1.5 animate-pulse">
          {t("tap.noEnergy", "Energy depleted — regenerating...")}
        </p>
      )}
    </div>
  );
}
