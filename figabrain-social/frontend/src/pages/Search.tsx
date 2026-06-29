import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Post } from "../api/types";
import { RANK_META } from "../lib/rankMeta";

interface UserResult {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rank: string;
}

type Tab = "users" | "posts";

export function Search() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [tab, setTab] = useState<Tab>(initialQ.startsWith("#") ? "posts" : "users");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(q?: string) {
    const term = (q ?? query).trim();
    if (!term) return;
    setIsSearching(true);
    setSearched(false);
    setSearchParams({ q: term });
    try {
      const isHashtag = term.startsWith("#");
      const [uRes, pRes] = await Promise.all([
        isHashtag
          ? Promise.resolve({ data: [] as UserResult[] })
          : api.get<{ data: UserResult[] }>(`/users/search?q=${encodeURIComponent(term)}`),
        api.get<{ data: Post[] }>(`/posts/search?q=${encodeURIComponent(term)}&limit=20`),
      ]);
      setUsers(uRes.data);
      setPosts(pRes.data);
      if (isHashtag) setTab("posts");
    } catch {
      setUsers([]);
      setPosts([]);
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  }

  // Auto-search when query is pre-filled from URL or hashtag click
  useEffect(() => {
    if (initialQ) { search(initialQ); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-search when URL param changes (e.g., clicking different hashtags)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) {
      setQuery(q);
      search(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="max-w-2xl">
      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={t("search.placeholder")}
          className="flex-1 bg-black/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brain-accent/40"
        />
        <button
          onClick={() => search()}
          disabled={isSearching || !query.trim()}
          className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
        >
          {isSearching ? "..." : t("search.search")}
        </button>
      </div>

      {/* Hashtag hint */}
      {query.startsWith("#") && (
        <p className="text-xs text-brain-accent2/70 mb-3">Searching for hashtag: {query}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(["users", "posts"] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t_ ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {t_ === "users" ? "Users" : "Posts"}
            {searched && (
              <span className="ml-1.5 text-xs text-white/30">
                {t_ === "users" ? users.length : posts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state before first search */}
      {!searched && !isSearching && (
        <div className="flex flex-col items-center gap-3 py-16 text-white/30">
          <span className="text-4xl">🔍</span>
          <p className="text-sm">{t("search.hint", "Enter a name or keyword to search")}</p>
          <p className="text-xs text-white/20">Tip: search #hashtag to find posts by topic</p>
        </div>
      )}

      {/* Users tab */}
      {searched && tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 && (
            <p className="text-white/40 text-sm text-center py-6">{t("search.notFound")}</p>
          )}
          {users.map((user) => (
            <Link
              key={user.username}
              to={`/u/${user.username}`}
              className="flex items-center gap-3 glass-panel rounded-xl p-3 hover:bg-white/5 transition-colors"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brain-accent/20 flex items-center justify-center text-sm font-bold">
                  {(user.displayName ?? user.username)[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{user.displayName ?? user.username}</div>
                <div className="text-xs text-white/40">@{user.username}</div>
              </div>
              <span className="text-xs text-white/40 shrink-0">
                {RANK_META[user.rank as keyof typeof RANK_META]?.emoji} {(RANK_META[user.rank as keyof typeof RANK_META]?.label ?? user.rank).toLowerCase()}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Posts tab */}
      {searched && tab === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="text-white/40 text-sm text-center py-6">No posts found.</p>
          )}
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/posts/${post.id}`)}
              className="glass-panel rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {post.author.avatarUrl ? (
                  <img src={post.author.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brain-accent/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {post.author.displayName[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold">{post.author.displayName}</span>
                <span className="text-xs text-white/30">@{post.author.username}</span>
                <span className="ml-auto text-xs text-white/25">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-white/80 line-clamp-3 leading-relaxed">{post.content}</p>
              <div className="flex gap-4 mt-2 text-xs text-white/30">
                <span>♥ {post.likesCount}</span>
                <span>💬 {post.commentsCount}</span>
                <span>⟲ {post.repostsCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
