import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { RewardConfigEntry } from "../api/types";

interface LedgerEntry {
  id: string;
  action: string;
  amount: string;
  createdAt: string;
}

export function Rewards() {
  const [config, setConfig] = useState<RewardConfigEntry[]>([]);
  const [history, setHistory] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    api.get<{ data: RewardConfigEntry[] }>("/rewards/config").then((res) => setConfig(res.data));
    api.get<{ data: LedgerEntry[] }>("/rewards/me/history").then((res) => setHistory(res.data));
  }, []);

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
        <h2 className="text-lg font-bold mb-3">Your History</h2>
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="glass-panel rounded-xl p-3 flex justify-between text-sm">
              <span>{entry.action}</span>
              <span className="text-brain-point font-semibold">+{Number(entry.amount).toFixed(2)} BP</span>
            </div>
          ))}
          {history.length === 0 && <p className="text-white/40 text-sm">No reward history yet.</p>}
        </div>
      </div>
    </div>
  );
}
