import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Post } from "../api/types";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useRewardToast } from "../context/RewardToastContext";

type FeedFilter = "all" | "following";

export function Feed() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showReward } = useRewardToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (f: FeedFilter, cursor?: string) => {
    if (!cursor) setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", filter: f });
      if (cursor) params.set("cursor", cursor);
      const res = await api.get<{ data: Post[]; nextCursor: string | null }>(`/posts/feed?${params}`);
      if (cursor) {
        setPosts((prev) => [...prev, ...res.data]);
      } else {
        setPosts(res.data);
      }
      setNextCursor(res.nextCursor);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    loadFeed(filter);
  }, [filter, loadFeed]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
        setIsLoadingMore(true);
        loadFeed(filter, nextCursor);
      }
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [nextCursor, isLoadingMore, filter, loadFeed]);

  async function handleSubmit() {
    if (!content.trim()) return;
    setIsPosting(true);
    setError(null);
    try {
      const res = await api.post<{ data: Post; reward?: { amount: number; xp: number } }>("/posts", { content, imageUrls: [] });
      setPosts((prev) => [res.data, ...prev]);
      setContent("");
      if (res.reward) { showReward(res.reward); refreshUser(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsPosting(false);
    }
  }

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
    try { await api.post(`/posts/${post.id}/repost`); await loadFeed(filter); } catch { /* already reposted */ }
  }

  return (
    <div>
      {user && (
        <div className="glass-panel rounded-2xl p-4 mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
            placeholder={t("feed.placeholder")}
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
              {isPosting ? t("feed.posting") : t("feed.post")}
            </button>
          </div>
        </div>
      )}

      {/* Feed tabs */}
      <div className="flex gap-1 mb-4">
        {(["all", "following"] as FeedFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {f === "all" ? "All" : "Following"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-4 h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={handleLike} onRepost={handleRepost} />
          ))}
          {posts.length === 0 && (
            <p className="text-white/40 text-sm text-center mt-10">
              {filter === "following" ? "Follow some users to see their posts here." : t("feed.empty")}
            </p>
          )}
          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="py-4 text-center">
            {isLoadingMore && <span className="text-white/30 text-xs">Loading...</span>}
            {!nextCursor && posts.length > 0 && <span className="text-white/20 text-xs">{t("feed.noMore")}</span>}
          </div>
        </>
      )}
    </div>
  );
}
