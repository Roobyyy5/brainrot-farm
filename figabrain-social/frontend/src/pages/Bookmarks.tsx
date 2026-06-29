import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Post } from "../api/types";
import { PostCard } from "../components/PostCard";
import { useRewardToast } from "../context/RewardToastContext";
import { useAuth } from "../context/AuthContext";

export function Bookmarks() {
  const { refreshUser } = useAuth();
  const { showReward } = useRewardToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Post[] }>("/posts/bookmarks/me")
      .then((r) => setPosts(r.data))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleLike(post: Post) {
    const wasLiked = post.likedByMe;
    setPosts((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, likedByMe: !wasLiked, likesCount: p.likesCount + (wasLiked ? -1 : 1) } : p
    ));
    try {
      const res = await api.post<{ data: { liked: boolean }; reward?: { amount: number; xp: number } }>(`/posts/${post.id}/like`);
      if (!wasLiked && res.reward) { showReward(res.reward); refreshUser(); }
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id === post.id ? { ...p, likedByMe: wasLiked, likesCount: p.likesCount + (wasLiked ? 1 : -1) } : p
      ));
    }
  }

  async function handleRepost(post: Post) {
    try { await api.post(`/posts/${post.id}/repost`); } catch { /* ignore */ }
  }

  function handleBookmark(post: Post) {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-6">Bookmarks</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-4 h-36 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🔖</div>
          <p className="text-white/40 text-sm">No bookmarks yet. Save posts to find them here.</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={{ ...post, bookmarkedByMe: true }}
            onLike={handleLike}
            onRepost={handleRepost}
            onBookmark={handleBookmark}
          />
        ))
      )}
    </div>
  );
}
