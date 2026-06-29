import { usePriceTicker } from "../hooks/usePriceTicker";

const SYMBOLS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  binancecoin: "BNB",
  solana: "SOL",
  "matic-network": "MATIC",
};

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function PriceTicker() {
  const { prices, error } = usePriceTicker();

  if (error || prices.length === 0) return null;

  const items = [...prices, ...prices];

  return (
    <div className="overflow-hidden flex-1 min-w-0">
      <div
        className="flex gap-6 whitespace-nowrap"
        style={{ animation: "ticker 30s linear infinite" }}
      >
        {items.map((p, i) => {
          const change = p.price_change_percentage_24h;
          const up = change >= 0;
          return (
            <span key={`${p.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs">
              <span className="text-white/50 font-mono">{SYMBOLS[p.id] ?? p.symbol.toUpperCase()}</span>
              <span className="font-semibold">${fmt(p.current_price)}</span>
              <span className={up ? "text-green-400" : "text-red-400"}>
                {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
