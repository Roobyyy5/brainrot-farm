import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { TrendingHashtag } from "../api/types";

export function TrendingHashtags() {
  const [tags, setTags] = useState<TrendingHashtag[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ data: TrendingHashtag[] }>("/posts/trending/hashtags").then((r) => setTags(r.data)).catch(() => {});
  }, []);

  if (tags.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl p-4 mb-4">
      <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Trending</h3>
      <div className="space-y-2">
        {tags.map((t) => (
          <button
            key={t.tag}
            onClick={() => navigate(`/search?q=${encodeURIComponent(t.tag)}`)}
            className="w-full flex items-center justify-between hover:bg-white/5 rounded-lg px-2 py-1 transition-colors group"
          >
            <span className="text-sm text-brain-accent2 font-medium group-hover:underline">{t.tag}</span>
            <span className="text-xs text-white/30">{t.count} posts</span>
          </button>
        ))}
      </div>
    </div>
  );
}
