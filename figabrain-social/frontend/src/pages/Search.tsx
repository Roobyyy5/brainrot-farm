import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface UserResult {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rank: string;
}

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setSearched(false);
    try {
      const res = await api.get<{ data: UserResult[] }>(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6 max-w-md">
      <h2 className="text-lg font-bold mb-4">Search users</h2>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="@username or display name"
          className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={search}
          disabled={isSearching || !query.trim()}
          className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </div>

      {searched && results.length === 0 && (
        <p className="text-white/40 text-sm text-center">No users found.</p>
      )}

      <div className="space-y-2">
        {results.map((user) => (
          <Link
            key={user.username}
            to={`/u/${user.username}`}
            className="flex items-center gap-3 glass-panel rounded-xl p-3 hover:bg-white/5 transition-colors"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brain-accent/30 flex items-center justify-center text-xs font-bold">
                {(user.displayName ?? user.username)[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold">{user.displayName ?? user.username}</div>
              <div className="text-xs text-white/40">@{user.username}</div>
            </div>
            <span className="ml-auto text-xs text-white/30 capitalize">{user.rank.toLowerCase()}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
