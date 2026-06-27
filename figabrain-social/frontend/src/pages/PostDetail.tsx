import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Post, Comment } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useRewardToast } from "../context/RewardToastContext";

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showReward } = useRewardToast();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    api.get<{ data: Post }>(`/posts/${id}`)
      .then((r) => { setPost(r.data); setEditContent(r.data.content); })
      .catch(() => navigate("/", { replace: true }));
    loadComments();
    if (window.location.hash === "#comments") {
      setTimeout(() => commentInputRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  }, [id]);

  async function loadComments(cursor?: string) {
    if (!id) return;
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const res = await api.get<{ data: Comment[]; nextCursor: string | null }>(`/posts/${id}/comments?${params}`);
    setComments((prev) => cursor ? [...prev, ...res.data] : res.data);
    setNextCursor(res.nextCursor);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try { await loadComments(nextCursor); } finally { setIsLoadingMore(false); }
  }

  async function handleLike() {
    if (!post) return;
    const wasLiked = post.likedByMe;
    setPost({ ...post, likedByMe: !wasLiked, likesCount: post.likesCount + (wasLiked ? -1 : 1) });
    try {
      const res = await api.post<{ data: { liked: boolean }; reward?: { amount: number; xp: number } }>(`/posts/${post.id}/like`);
      if (!wasLiked && res.reward) { showReward(res.reward); refreshUser(); }
    } catch {
      setPost({ ...post, likedByMe: wasLiked, likesCount: post.likesCount + (wasLiked ? 1 : -1) });
    }
  }

  async function saveEdit() {
    if (!post || !editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await api.patch<{ data: Post }>(`/posts/${post.id}`, { content: editContent.trim() });
      setPost(res.data);
      setIsEditing(false);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deletePost() {
    if (!post || !confirm(t("postDetail.confirmDelete"))) return;
    await api.delete(`/posts/${post.id}`);
    navigate("/", { replace: true });
  }

  async function reportPost() {
    if (!post || reportDone) return;
    const reason = prompt(t("postDetail.reportPrompt"));
    if (reason === null) return;
    setIsReporting(true);
    try {
      await api.post(`/posts/${post.id}/report`, { reason: reason.trim() || "inappropriate" });
      setReportDone(true);
    } finally {
      setIsReporting(false);
    }
  }

  async function sharePost() {
    if (!post) return;
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: `Post by @${post.author.username}`, text: post.content.slice(0, 100), url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  async function repostPost() {
    if (!post) return;
    try {
      await api.post(`/posts/${post.id}/repost`);
      setPost({ ...post, repostsCount: post.repostsCount + 1 });
    } catch { /* ignore */ }
  }

  async function submitComment() {
    if (!id || !commentText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.post<{ data: Comment; reward?: { amount: number; xp: number } }>(`/posts/${id}/comments`, { content: commentText.trim() });
      setComments((prev) => [res.data, ...prev]);
      setCommentText("");
      setPost((p) => p ? { ...p, commentsCount: p.commentsCount + 1 } : p);
      if (res.reward) { showReward(res.reward); refreshUser(); }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!post) {
    return (
      <div className="space-y-3 animate-pulse max-w-2xl">
        <div className="h-6 bg-white/5 rounded w-16" />
        <div className="glass-panel rounded-2xl p-6 h-48" />
        <div className="glass-panel rounded-2xl p-4 h-24" />
      </div>
    );
  }

  const isOwn = user?.id === post.author.id;

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1">
        {t("postDetail.back")}
      </button>

      {/* Post */}
      <div className="glass-panel rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Link to={`/u/${post.author.username}`}>
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center font-bold text-lg">
                {post.author.displayName[0].toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/u/${post.author.username}`} className="font-semibold hover:underline">{post.author.displayName}</Link>
            <div className="text-xs text-white/40">@{post.author.username} · {new Date(post.createdAt).toLocaleString()}</div>
          </div>
          {isOwn && !isEditing && (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(true)} className="text-xs text-white/40 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5">
                {t("postDetail.edit")}
              </button>
              <button onClick={deletePost} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10">
                {t("postDetail.delete")}
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full bg-black/30 rounded-xl px-3 py-2 text-sm outline-none resize-none mb-2"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-full">
                {t("common.cancel")}
              </button>
              <button onClick={saveEdit} disabled={isSavingEdit || !editContent.trim()} className="bg-brain-accent/20 hover:bg-brain-accent/30 text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-40">
                {isSavingEdit ? t("postDetail.saving") : t("postDetail.save")}
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed mb-4">{post.content}</p>
        )}

        {post.imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {post.imageUrls.map((url) => <img key={url} src={url} alt="" className="rounded-xl object-cover max-h-64 w-full" />)}
          </div>
        )}

        <div className="flex gap-4 text-sm text-white/50 pt-3 border-t border-white/5">
          <button onClick={handleLike} className={`flex items-center gap-1 transition-colors ${post.likedByMe ? "text-brain-accent" : "hover:text-white"}`}>
            ♥ {post.likesCount}
          </button>
          <span className="flex items-center gap-1">💬 {post.commentsCount}</span>
          <button onClick={repostPost} className="flex items-center gap-1 hover:text-white transition-colors">
            ⟲ {post.repostsCount}
          </button>
          <button onClick={sharePost} className="flex items-center gap-1 hover:text-white transition-colors ml-auto">
            ↗ {t("postDetail.share")}
          </button>
          {!isOwn && (
            <button
              onClick={reportPost}
              disabled={isReporting || reportDone}
              className={`flex items-center gap-1 transition-colors ${reportDone ? "text-green-400" : "hover:text-red-400"}`}
            >
              {reportDone ? `✓ ${t("postDetail.reported")}` : isReporting ? "..." : `⚑ ${t("postDetail.report")}`}
            </button>
          )}
        </div>
      </div>

      {/* Comment box */}
      {user && (
        <div id="comments" className="glass-panel rounded-2xl p-4 mb-4">
          <textarea
            ref={commentInputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment(); }}
            placeholder={t("postDetail.commentPlaceholder")}
            rows={2}
            maxLength={1000}
            className="w-full bg-transparent outline-none resize-none text-sm placeholder:text-white/30"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submitComment}
              disabled={isSubmitting || !commentText.trim()}
              className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-xs font-semibold px-4 py-1.5 rounded-full disabled:opacity-40"
            >
              {isSubmitting ? "..." : t("postDetail.reply")}
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              {c.author.avatarUrl ? (
                <img src={c.author.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-brain-accent/20 flex items-center justify-center text-xs font-bold">
                  {c.author.displayName[0].toUpperCase()}
                </div>
              )}
              <Link to={`/u/${c.author.username}`} className="text-sm font-semibold hover:underline">{c.author.displayName}</Link>
              <span className="text-xs text-white/30">@{c.author.username}</span>
              <span className="ml-auto text-xs text-white/25">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm leading-relaxed">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-white/30 text-sm text-center py-6">{t("postDetail.noComments")}</p>}
        {nextCursor && (
          <button onClick={loadMore} disabled={isLoadingMore} className="w-full text-xs text-white/40 hover:text-white py-2">
            {isLoadingMore ? t("postDetail.loadingMore") : t("postDetail.loadMore")}
          </button>
        )}
      </div>
    </div>
  );
}
