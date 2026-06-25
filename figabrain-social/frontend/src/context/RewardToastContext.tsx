import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface RewardToastPayload {
  amount: number;
  xp: number;
}

interface RewardToastValue {
  showReward: (payload: RewardToastPayload) => void;
}

const RewardToastContext = createContext<RewardToastValue | null>(null);

export function RewardToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<(RewardToastPayload & { id: number })[]>([]);

  const showReward = useCallback((payload: RewardToastPayload) => {
    if (payload.amount <= 0 && payload.xp <= 0) return;
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...payload, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2200);
  }, []);

  return (
    <RewardToastContext.Provider value={{ showReward }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="glass-panel rounded-xl px-4 py-2 shadow-glow flex items-center gap-3"
            >
              {toast.amount > 0 && <span className="text-brain-point font-bold text-sm">+{toast.amount.toFixed(2)} BP</span>}
              {toast.xp > 0 && <span className="text-brain-accent2 font-bold text-sm">+{toast.xp} XP</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </RewardToastContext.Provider>
  );
}

export function useRewardToast(): RewardToastValue {
  const ctx = useContext(RewardToastContext);
  if (!ctx) throw new Error("useRewardToast must be used within RewardToastProvider");
  return ctx;
}
