import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { RewardConfigEntry } from "../api/types";

interface LedgerEntry {
  id: string;
  action: string;
  amount: string;
  createdAt: string;
}

function SkeletonCard({ className }: { className?: string }) {
  return <div className={`glass-panel rounded-xl animate-pulse ${className}`} />;
}

export function Rewards() {
  const [config, setConfig] = useState<RewardConfigEntry[]>([]);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: RewardConfigEntry[] }>("/rewards/config"),
      api.get<{ data: LedgerEntry[] }>("/rewards/me/history"),
    ]).then(([configRes, historyRes]) => {
      setConfig(configRes.data);
      setHistory(historyRes.data);
    }).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-16" />)}
          </div>
        </div>
        <div>
          <div className="h-6 w-28 bg-white/5 rounded animate-pulse mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} className="h-11" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-3">Reward Rules</h2>
        <div className="grid grid-cols-2 gap-3">
          {config.map((rule) => (
            <div key={rule.id} className="glass-panel rounded-xl p-3">
              <div className="text-sm font-semibold">{rule.action}</div>
              <div className="text-brain-point font-bold">+{Number(rule.amount).toFixed(2)} BP</div>
              {rule.dailyCap && <div className="text-xs text-white/40">cap {Number(rule.dailyCap).toFixed(1)}/day</div>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Your History</h2>
          {history.length > 0 && (
            <div className="text-sm text-brain-point font-bold">
              Total: +{history.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)} BP
            </div>
          )}
        </div>
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="glass-panel rounded-xl p-3 flex justify-between items-center text-sm">
              <div>
                <span>{entry.action}</span>
                <div className="text-xs text-white/30">{new Date(entry.createdAt).toLocaleString()}</div>
              </div>
              <span className="text-brain-point font-semibold">+{Number(entry.amount).toFixed(2)} BP</span>
            </div>
          ))}
          {history.length === 0 && <p className="text-white/40 text-sm">No reward history yet.</p>}
        </div>
      </div>
    </div>
  );
}
