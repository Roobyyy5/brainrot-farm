import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Post } from "../api/types";

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
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setSearched(false);
    try {
      const [uRes, pRes] = await Promise.all([
        api.get<{ data: UserResult[] }>(`/users/search?q=${encodeURIComponent(q)}`),
        api.get<{ data: Post[] }>(`/posts/search?q=${encodeURIComponent(q)}&limit=20`),
      ]);
      setUsers(uRes.data);
      setPosts(pRes.data);
    } catch {
      setUsers([]);
      setPosts([]);
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={t("search.placeholder")}
          className="flex-1 bg-black/30 rounded-xl px-4 py-2.5 text-sm outline-none"
        />
        <button
          onClick={search}
          disabled={isSearching || !query.trim()}
          className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
        >
          {isSearching ? "..." : t("search.search")}
        </button>
      </div>

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
              <span className="text-xs text-white/30 capitalize shrink-0">{user.rank.toLowerCase().replace("_", " ")}</span>
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
                <div className="w-7 h-7 rounded-full bg-brain-accent/20 flex items-center justify-center text-xs font-bold shrink-0">
                  {post.author.displayName[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold">{post.author.displayName}</span>
                <span className="text-xs text-white/30">@{post.author.username}</span>
                <span className="ml-auto text-xs text-white/25">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-white/80 line-clamp-3 leading-relaxed">{post.content}</p>
              <div className="flex gap-4 mt-2 text-xs text-white/30">
                <span>♥ {post.likesCount}</span>
                <span>💬 {post.commentsCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
