import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import type { Post } from "../api/types";

interface PostCardProps {
  post: Post;
  onLike: (post: Post) => void;
  onRepost: (post: Post) => void;
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
  const parts = text.split(/(@[a-zA-Z0-9_]{1,32})/g);
  return (
    <>
      {parts.map((part, i) =>
        /^@[a-zA-Z0-9_]{1,32}$/.test(part) ? (
          <Link
            key={i}
            to={`/u/${part.slice(1)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-brain-accent hover:underline"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function PostCard({ post, onLike, onRepost }: PostCardProps) {
  const navigate = useNavigate();

  function share() {
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: `${post.author.displayName} on FIGABRAIN`, text: post.content.slice(0, 100), url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
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
            @{post.author.username} · {post.author.rank}
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
        <div className="grid grid-cols-2 gap-2 mb-3">
          {post.imageUrls.map((url) => (
            <img key={url} src={url} alt="" className="rounded-xl object-cover max-h-64 w-full" />
          ))}
        </div>
      )}
      {post.gifUrl && <img src={post.gifUrl} alt="" className="rounded-xl mb-3 max-h-64" />}
      {post.linkUrl && (
        <a href={post.linkUrl} target="_blank" rel="noreferrer" className="text-brain-accent2 text-sm underline block mb-3">
          {post.linkUrl}
        </a>
      )}

      <div className="flex gap-5 text-sm text-white/50">
        <button
          onClick={() => onLike(post)}
          className={`flex items-center gap-1 transition-colors ${post.likedByMe ? "text-brain-accent" : "hover:text-white"}`}
        >
          ♥ {post.likesCount}
        </button>
        <button
          onClick={() => navigate(`/posts/${post.id}#comments`)}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          💬 {post.commentsCount}
        </button>
        <button onClick={() => onRepost(post)} className="flex items-center gap-1 hover:text-white transition-colors">
          ⟲ {post.repostsCount}
        </button>
        <button onClick={share} className="ml-auto hover:text-white transition-colors" title="Share">
          ↗
        </button>
      </div>
    </motion.article>
  );
}
