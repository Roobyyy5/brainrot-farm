import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Post } from "../api/types";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useRewardToast } from "../context/RewardToastContext";

export function Feed() {
  const { user, refreshUser } = useAuth();
  const { showReward } = useRewardToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    const res = await api.get<{ data: Post[] }>("/posts/feed");
    setPosts(res.data);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleSubmit() {
    if (!content.trim()) return;
    setIsPosting(true);
    setError(null);
    try {
      const res = await api.post<{ data: Post; reward?: { amount: number; xp: number } }>("/posts", {
        content,
        imageUrls: [],
      });
      setPosts((prev) => [res.data, ...prev]);
      setContent("");
      if (res.reward) {
        showReward(res.reward);
        refreshUser();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsPosting(false);
    }
  }

  async function handleLike(post: Post) {
    const wasLiked = post.likedByMe;
    // Optimistic update first for instant feedback.
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !wasLiked, likesCount: p.likesCount + (wasLiked ? -1 : 1) }
          : p
      )
    );
    try {
      const res = await api.post<{ data: { liked: boolean }; reward?: { amount: number; xp: number } }>(
        `/posts/${post.id}/like`
      );
      if (!wasLiked && res.reward) {
        showReward(res.reward);
        refreshUser();
      }
    } catch {
      // Rollback to previous state on failure.
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: wasLiked, likesCount: p.likesCount + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  }

  async function handleRepost(post: Post) {
    try {
      await api.post(`/posts/${post.id}/repost`);
      await loadFeed();
    } catch {
      // already reposted or rate limited — feed stays as-is
    }
  }

  return (
    <div>
      {user && (
        <div className="glass-panel rounded-2xl p-4 mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Що відбувається в FIGABRAIN?"
            className="w-full bg-transparent outline-none resize-none text-sm placeholder:text-white/30"
            rows={3}
            maxLength={2000}
          />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isPosting || !content.trim()}
              className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-5 py-2 rounded-full disabled:opacity-40"
            >
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} onLike={handleLike} onRepost={handleRepost} />
      ))}
      {posts.length === 0 && <p className="text-white/40 text-sm text-center mt-10">No posts yet. Be the first to farm Brain Points.</p>}
    </div>
  );
}
