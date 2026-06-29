import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import type { Post } from "../api/types";
import { RANK_META } from "../lib/rankMeta";
import { api } from "../api/client";

interface PostCardProps {
  post: Post;
  onLike: (post: Post) => void;
  onRepost: (post: Post) => void;
  onBookmark?: (post: Post) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function RichText({ text }: { text: string }) {
  const navigate = useNavigate();
  const parts = text.split(/(@[a-zA-Z0-9_]{1,32}|#[a-zA-Z]\w{0,49})/g);

  return (
    <>
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]{1,32}$/.test(part)) {
          return (
            <Link
              key={i}
              to={`/u/${part.slice(1)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-brain-accent hover:underline"
            >
              {part}
            </Link>
          );
        }
        if (/^#[a-zA-Z]\w{0,49}$/.test(part)) {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/search?q=${encodeURIComponent(part)}`);
              }}
              className="text-brain-accent2 hover:underline cursor-pointer"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function PostCard({ post, onLike, onRepost, onBookmark }: PostCardProps) {
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(post.bookmarkedByMe ?? false);
  const [showTipInput, setShowTipInput] = useState(false);
  const [tipAmount, setTipAmount] = useState("10");
  const [isTipping, setIsTipping] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);

  function share() {
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: `${post.author.displayName} on FIGABRAIN`, text: post.content.slice(0, 100), url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  async function toggleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    setBookmarked((v) => !v);
    try {
      await api.post(`/posts/${post.id}/bookmark`);
      onBookmark?.(post);
    } catch {
      setBookmarked((v) => !v);
    }
  }

  async function sendTip(e: React.MouseEvent) {
    e.stopPropagation();
    const amount = parseInt(tipAmount, 10);
    if (!amount || amount <= 0) return;
    setIsTipping(true);
    try {
      await api.post(`/posts/${post.id}/tip`, { amount });
      setTipSuccess(true);
      setShowTipInput(false);
      setTimeout(() => setTipSuccess(false), 3000);
    } catch {
      /* ignore */
    } finally {
      setIsTipping(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-4 mb-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <Link to={`/u/${post.author.username}`} onClick={(e) => e.stopPropagation()}>
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center font-bold">
              {post.author.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </Link>
        <div>
          <Link
            to={`/u/${post.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold leading-tight hover:underline block"
          >
            {post.author.displayName}
          </Link>
          <div className="text-xs text-white/40">
            @{post.author.username} · {RANK_META[post.author.rank]?.emoji} {RANK_META[post.author.rank]?.label ?? post.author.rank}
          </div>
        </div>
        <span className="ml-auto text-xs text-white/25">{relativeTime(post.createdAt)}</span>
      </div>

      <p
        className="whitespace-pre-wrap text-sm leading-relaxed mb-3 cursor-pointer"
        onClick={() => navigate(`/posts/${post.id}`)}
      >
        <RichText text={post.content} />
      </p>

      {post.imageUrls.length > 0 && (
        <div className={`grid gap-2 mb-3 ${post.imageUrls.length === 1 ? "" : "grid-cols-2"}`}>
          {post.imageUrls.map((url) => (
            <img key={url} src={url} alt="" className="rounded-xl object-cover max-h-72 w-full" />
          ))}
        </div>
      )}
      {post.gifUrl && (
        <img src={post.gifUrl} alt="" className="rounded-xl mb-3 max-h-64 w-full object-cover" />
      )}
      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-brain-accent2 text-sm underline block mb-3 truncate"
        >
          {post.linkUrl}
        </a>
      )}

      {/* Tip input */}
      {showTipInput && (
        <div className="flex items-center gap-2 mb-3 bg-black/20 rounded-xl px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-white/50">Tip BP:</span>
          <input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            className="w-16 bg-transparent outline-none text-sm text-center"
            min="1"
            max="10000"
          />
          <button
            onClick={sendTip}
            disabled={isTipping}
            className="text-xs bg-brain-point/20 text-brain-point px-3 py-1 rounded-full disabled:opacity-50"
          >
            {isTipping ? "..." : "Send"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowTipInput(false); }} className="text-xs text-white/30">✕</button>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-white/50">
        <button
          onClick={(e) => { e.stopPropagation(); onLike(post); }}
          className={`flex items-center gap-1 transition-colors ${post.likedByMe ? "text-brain-accent" : "hover:text-white"}`}
        >
          ♥ {post.likesCount}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/posts/${post.id}#comments`); }}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          💬 {post.commentsCount}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRepost(post); }}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          ⟲ {post.repostsCount}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowTipInput((v) => !v); }}
          className={`flex items-center gap-1 transition-colors ${tipSuccess ? "text-brain-point" : "hover:text-brain-point"}`}
          title="Tip BP"
        >
          {tipSuccess ? "✓ Tipped!" : "💰"}
        </button>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={toggleBookmark}
            className={`transition-colors ${bookmarked ? "text-brain-accent" : "hover:text-white"}`}
            title={bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {bookmarked ? "🔖" : "🏷"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); share(); }} className="hover:text-white transition-colors" title="Share">
            ↗
          </button>
        </div>
      </div>
    </motion.article>
  );
}
