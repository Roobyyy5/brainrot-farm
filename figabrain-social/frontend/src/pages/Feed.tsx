import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Post } from "../api/types";
import { PostCard } from "../components/PostCard";
import { StoriesBar } from "../components/StoriesBar";
import { useAuth } from "../context/AuthContext";
import { useRewardToast } from "../context/RewardToastContext";
import { useImageUpload } from "../hooks/useImageUpload";

type FeedFilter = "all" | "following";
type MediaMode = "none" | "image" | "gif" | "upload";

const DRAFT_KEY = "feed:draft";

export function Feed() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showReward } = useRewardToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState(() => localStorage.getItem(DRAFT_KEY) ?? "");
  const [imageUrl, setImageUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [uploadedDataUrl, setUploadedDataUrl] = useState("");
  const [mediaMode, setMediaMode] = useState<MediaMode>("none");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error: uploadError } = useImageUpload();
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
      const imageUrls = uploadedDataUrl
        ? [uploadedDataUrl]
        : imageUrl.trim() ? [imageUrl.trim()] : [];
      const res = await api.post<{ data: Post; reward?: { amount: number; xp: number } }>("/posts", {
        content,
        imageUrls,
        ...(gifUrl.trim() ? { gifUrl: gifUrl.trim() } : {}),
      });
      setPosts((prev) => [res.data, ...prev]);
      setContent("");
      setImageUrl("");
      setGifUrl("");
      setUploadedDataUrl("");
      setMediaMode("none");
      localStorage.removeItem(DRAFT_KEY);
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
      <StoriesBar />

      {user && (
        <div className="glass-panel rounded-2xl p-4 mb-6">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); localStorage.setItem(DRAFT_KEY, e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
            placeholder={t("feed.placeholder")}
            className="w-full bg-transparent outline-none resize-none text-sm placeholder:text-white/30"
            rows={3}
            maxLength={2000}
          />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const result = await upload(file);
              if (result) { setUploadedDataUrl(result); setMediaMode("upload"); }
              e.target.value = "";
            }}
          />

          {mediaMode === "upload" && uploadedDataUrl && (
            <div className="mb-2 relative">
              <img src={uploadedDataUrl} alt="" className="rounded-xl max-h-56 object-cover w-full" />
              <button
                onClick={() => { setUploadedDataUrl(""); setMediaMode("none"); }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black"
              >✕</button>
            </div>
          )}

          {mediaMode === "image" && (
            <div className="mb-2">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL (https://...)"
                className="w-full bg-black/20 rounded-lg px-3 py-1.5 text-xs outline-none"
              />
              {imageUrl && (
                <img src={imageUrl} alt="" className="mt-2 rounded-xl max-h-48 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>
          )}

          {mediaMode === "gif" && (
            <div className="mb-2">
              <input
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                placeholder="GIF URL (https://media.giphy.com/...)"
                className="w-full bg-black/20 rounded-lg px-3 py-1.5 text-xs outline-none"
              />
              {gifUrl && (
                <img src={gifUrl} alt="" className="mt-2 rounded-xl max-h-48 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>
          )}

          {(uploadError) && <p className="text-red-400 text-xs mb-1">{uploadError}</p>}

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              {/* Завантажити файл */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${mediaMode === "upload" ? "text-brain-accent bg-brain-accent/10" : "text-white/30 hover:text-white"}`}
                title="Завантажити фото"
              >
                {uploading ? "⏳" : "📎"}
              </button>
              <button
                onClick={() => setMediaMode((m) => m === "image" ? "none" : "image")}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${mediaMode === "image" ? "text-brain-accent bg-brain-accent/10" : "text-white/30 hover:text-white"}`}
                title="URL зображення"
              >
                🖼
              </button>
              <button
                onClick={() => setMediaMode((m) => m === "gif" ? "none" : "gif")}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${mediaMode === "gif" ? "text-brain-accent2 bg-brain-accent2/10" : "text-white/30 hover:text-white"}`}
                title="GIF"
              >
                GIF
              </button>
              <span className={`text-xs ${content.length > 1800 ? "text-red-400" : "text-white/20"}`}>
                {content.length} / 2000
              </span>
            </div>
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
            {f === "all" ? t("feed.filterAll") : t("feed.filterFollowing")}
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
              {filter === "following" ? t("feed.followingEmpty") : t("feed.empty")}
            </p>
          )}
          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="py-4 text-center">
            {isLoadingMore && <span className="text-white/30 text-xs">{t("feed.loading")}</span>}
            {!nextCursor && posts.length > 0 && <span className="text-white/20 text-xs">{t("feed.noMore")}</span>}
          </div>
        </>
      )}
    </div>
  );
}
