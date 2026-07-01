import { useTranslation } from "react-i18next";

interface Props {
  bp: number;
  onClose: () => void;
}

export function OfflineModal({ bp, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="glass-panel rounded-2xl p-8 max-w-sm w-full text-center border border-brain-accent/30 shadow-[0_0_60px_rgba(124,92,255,0.3)]">
        <div className="text-5xl mb-3">🤖</div>
        <h2 className="text-xl font-black mb-1">
          {t("tap.offlineTitle", "Your Brain was busy!")}
        </h2>
        <p className="text-white/50 text-sm mb-4">
          {t("tap.offlineDesc", "Your Auto Brain earned BP while you were away.")}
        </p>
        <div className="text-4xl font-black text-brain-point mb-6">
          +{bp.toFixed(1)} BP
        </div>
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          {t("tap.offlineCollect", "Collect & Play")}
        </button>
      </div>
    </div>
  );
}
