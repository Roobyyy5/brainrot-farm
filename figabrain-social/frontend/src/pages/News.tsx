import { useEffect, useState } from "react";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string;
  body: string;
}

const SOURCES = [
  { name: "CoinDesk", rss: "https://www.coindesk.com/arc/outboundfeeds/rss/", icon: "📰" },
  { name: "Decrypt", rss: "https://decrypt.co/feed", icon: "🔓" },
  { name: "CoinTelegraph", rss: "https://cointelegraph.com/rss", icon: "📡" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Use CryptoCompare news API (free, no key required for basic)
async function fetchCryptoNews(): Promise<NewsItem[]> {
  const res = await fetch(
    "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular",
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("Failed to fetch news");
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.Data ?? []).slice(0, 30).map((item: any) => ({
    id: String(item.id),
    title: item.title,
    url: item.url,
    source: item.source_info?.name ?? item.source,
    imageUrl: item.imageurl ?? null,
    publishedAt: new Date(item.published_on * 1000).toISOString(),
    body: item.body ? item.body.slice(0, 200) : "",
  }));
}

type Category = "all" | "bitcoin" | "ethereum" | "defi" | "nft";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bitcoin", label: "Bitcoin" },
  { key: "ethereum", label: "Ethereum" },
  { key: "defi", label: "DeFi" },
  { key: "nft", label: "NFT" },
];

export function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("all");

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchCryptoNews()
      .then(setItems)
      .catch(() => setError("Could not load news. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = category === "all"
    ? items
    : items.filter((i) =>
        i.title.toLowerCase().includes(category) ||
        i.body.toLowerCase().includes(category) ||
        i.source.toLowerCase().includes(category)
      );

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-4">Crypto News</h1>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === c.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-4 h-28 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="glass-panel rounded-2xl p-4 flex gap-3 hover:bg-white/5 transition-colors block"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1">{item.title}</h3>
                {item.body && (
                  <p className="text-xs text-white/40 line-clamp-2 mb-1">{item.body}…</p>
                )}
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span className="text-brain-accent2">{item.source}</span>
                  <span>·</span>
                  <span>{timeAgo(item.publishedAt)}</span>
                </div>
              </div>
            </a>
          ))}

          {filtered.length === 0 && (
            <p className="text-white/40 text-sm text-center py-8">No news for this category.</p>
          )}
        </div>
      )}

      {/* Source info */}
      <div className="mt-8 pt-4 border-t border-white/5">
        <p className="text-xs text-white/20 text-center">
          News sourced from CryptoCompare · Updates every minute
        </p>
      </div>
    </div>
  );
}
