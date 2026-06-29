import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { RANK_META } from "../lib/rankMeta";

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rank: string;
  _count: { followers: number };
}

function Avatar({ user, size = 8 }: { user: { displayName: string; avatarUrl: string | null }; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full object-cover shrink-0`;
  if (user.avatarUrl) return <img src={user.avatarUrl} alt="" className={cls} />;
  return (
    <div className={`${cls} bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center text-xs font-bold text-white`}>
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

function SuggestedUserRow({ user, onFollow }: { user: SuggestedUser; onFollow: (id: string) => void }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const rankMeta = RANK_META[user.rank as keyof typeof RANK_META];

  async function handleFollow() {
    setLoading(true);
    try {
      await api.post(`/users/${user.username}/follow`);
      setFollowing(true);
      onFollow(user.id);
    } catch { /* already following or error */ }
    finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Link to={`/u/${user.username}`} className="shrink-0">
        <Avatar user={user} size={8} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/u/${user.username}`} className="block">
          <p className="text-sm font-semibold leading-tight truncate hover:text-brain-accent transition-colors">
            {user.displayName}
          </p>
          <p className="text-xs text-white/40 truncate">
            @{user.username}
            {rankMeta && <span className="ml-1">{rankMeta.emoji}</span>}
          </p>
        </Link>
      </div>
      {!following ? (
        <button
          onClick={handleFollow}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 hover:bg-brain-accent/20 hover:text-brain-accent transition-colors disabled:opacity-40 shrink-0"
        >
          {loading ? "..." : "Follow"}
        </button>
      ) : (
        <span className="text-xs text-white/30 shrink-0">✓</span>
      )}
    </div>
  );
}

export function RightSidebar() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);

  useEffect(() => {
    api.get<{ data: SuggestedUser[] }>("/users/suggestions")
      .then((res) => setSuggestions(res.data))
      .catch(() => {});
  }, []);

  function removeSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((u) => u.id !== id));
  }

  if (!user) return null;

  const rankMeta = RANK_META[user.rank as keyof typeof RANK_META];

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-64 shrink-0">

      {/* Мій профіль */}
      <div className="glass-panel rounded-2xl p-4">
        <Link to={`/u/${user.username}`} className="flex items-center gap-3 mb-3 group">
          <Avatar user={user} size={10} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate group-hover:text-brain-accent transition-colors">
              {user.displayName}
            </p>
            <p className="text-xs text-white/40">@{user.username}</p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-brain-point">{user.brainPoints.toFixed(0)}</p>
            <p className="text-[10px] text-white/40 mt-0.5">Brain Points</p>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold">
              {rankMeta ? (
                <span title={rankMeta.label}>{rankMeta.emoji}</span>
              ) : (
                <span className="text-sm text-white/60">{user.rank}</span>
              )}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">{rankMeta?.label ?? "Rank"}</p>
          </div>
        </div>
      </div>

      {/* Кого підписати */}
      {suggestions.length > 0 && (
        <div className="glass-panel rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Who to follow
          </h3>
          <div className="space-y-0.5 divide-y divide-white/5">
            {suggestions.map((u) => (
              <SuggestedUserRow key={u.id} user={u} onFollow={removeSuggestion} />
            ))}
          </div>
        </div>
      )}

      {/* Посилання */}
      <div className="px-1">
        <p className="text-[10px] text-white/20 leading-relaxed">
          © 2025 FIGABRAIN Social ·{" "}
          <a href="mailto:figabrain@gmail.com" className="hover:text-white/40 transition-colors">
            Support
          </a>
        </p>
      </div>
    </aside>
  );
}
