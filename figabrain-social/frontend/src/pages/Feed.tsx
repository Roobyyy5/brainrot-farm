import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Post } from "../api/types";
import { PostCard } from "../components/PostCard";
import { StoriesBar } from "../components/StoriesBar";
import { useAuth } from "../context/AuthContext";
import { useRewardToast } from "../context/RewardToastContext";
import { resizeAndEncode } from "../hooks/useImageUpload";

type FeedFilter = "all" | "following";

type Attachment = {
  type: "image" | "video" | "file";
  preview: string;
  encoded: string;
  name: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

const DRAFT_KEY = "feed:draft";

export function Feed() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showReward } = useRewardToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState(() => localStorage.getItem(DRAFT_KEY) ?? "");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attError, setAttError] = useState<string | null>(null);
  const [attLoading, setAttLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPicker]);

  async function handleFile(file: File, type: "image" | "video" | "file") {
    setAttError(null);
    setAttLoading(true);
    setShowPicker(false);
    try {
      const MAX = type === "image" ? 10 : 30;
      if (file.size > MAX * 1024 * 1024) {
        setAttError(`Файл занадто великий (макс. ${MAX} МБ)`);
        return;
      }
      if (type === "image") {
        const dataUrl = await resizeAndEncode(file);
        setAttachment({ type: "image", preview: dataUrl, encoded: dataUrl, name: file.name });
      } else {
        const dataUrl = await fileToDataUrl(file);
        const encoded = JSON.stringify({ t: type === "video" ? "vid" : "file", data: dataUrl, name: file.name });
        setAttachment({ type, preview: dataUrl, encoded, name: file.name });
      }
    } catch {
      setAttError("Не вдалось обробити файл");
    } finally {
      setAttLoading(false);
    }
  }

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
      const imageUrls = attachment ? [attachment.encoded] : [];
      const res = await api.post<{ data: Post; reward?: { amount: number; xp: number } }>("/posts", {
        content,
        imageUrls,
      });
      setPosts((prev) => [res.data, ...prev]);
      setContent("");
      setAttachment(null);
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

          {/* Hidden file inputs */}
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleFile(f, "image"); e.target.value = ""; }} />
          <input ref={vidInputRef} type="file" accept="video/*" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleFile(f, "video"); e.target.value = ""; }} />
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleFile(f, "file"); e.target.value = ""; }} />

          {/* Attachment preview */}
          {attachment && (
            <div className="mb-3 relative">
              {attachment.type === "image" && (
                <img src={attachment.preview} alt="" className="rounded-xl max-h-56 object-cover w-full" />
              )}
              {attachment.type === "video" && (
                <video src={attachment.preview} controls className="rounded-xl max-h-56 w-full bg-black" />
              )}
              {attachment.type === "file" && (
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <span className="text-3xl">📄</span>
                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                </div>
              )}
              <button
                onClick={() => setAttachment(null)}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black"
              >✕</button>
            </div>
          )}
          {attError && <p className="text-red-400 text-xs mb-1">{attError}</p>}

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              {/* Media picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  disabled={attLoading}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${attachment ? "text-brain-accent bg-brain-accent/10" : "text-white/30 hover:text-white"}`}
                  title="Додати медіа"
                >
                  {attLoading ? "⏳" : "📎"}
                </button>
                {showPicker && (
                  <div className="absolute bottom-full mb-2 left-0 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px]">
                    {[
                      { label: "Фото", icon: "🖼️", action: () => imgInputRef.current?.click() },
                      { label: "Відео", icon: "🎬", action: () => vidInputRef.current?.click() },
                      { label: "Документ", icon: "📄", action: () => fileInputRef.current?.click() },
                    ].map(({ label, icon, action }) => (
                      <button key={label} onClick={action}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-white/10 transition-colors text-left">
                        <span>{icon}</span><span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
