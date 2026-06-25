import { motion } from "framer-motion";
import type { Post } from "../api/types";

interface PostCardProps {
  post: Post;
  onLike: (post: Post) => void;
  onRepost: (post: Post) => void;
}

export function PostCard({ post, onLike, onRepost }: PostCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-4 mb-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center font-bold">
          {post.author.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold leading-tight">{post.author.displayName}</div>
          <div className="text-xs text-white/40">
            @{post.author.username} · {post.author.rank}
          </div>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed mb-3">{post.content}</p>

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

      <div className="flex gap-6 text-sm text-white/50">
        <button
          onClick={() => onLike(post)}
          className={`flex items-center gap-1 transition-colors ${post.likedByMe ? "text-brain-accent" : "hover:text-white"}`}
        >
          ♥ {post.likesCount}
        </button>
        <span className="flex items-center gap-1">💬 {post.commentsCount}</span>
        <button onClick={() => onRepost(post)} className="flex items-center gap-1 hover:text-white">
          ⟲ {post.repostsCount}
        </button>
      </div>
    </motion.article>
  );
}
