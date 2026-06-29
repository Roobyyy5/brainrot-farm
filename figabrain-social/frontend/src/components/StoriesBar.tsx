import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Story } from "../api/types";

interface StoryModalProps {
  story: Story;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function StoryModal({ story, onClose, onNext, onPrev }: StoryModalProps) {
  const timeLeft = Math.max(0, Math.round((new Date(story.expiresAt).getTime() - Date.now()) / 3600000));

  useEffect(() => {
    api.post(`/stories/${story.id}/view`).catch(() => {});
    const timer = setTimeout(onNext, 5000);
    return () => clearTimeout(timer);
  }, [story.id, onNext]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="glass-panel rounded-3xl overflow-hidden">
          {story.imageUrl && (
            <img src={story.imageUrl} alt="" className="w-full max-h-96 object-cover" />
          )}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              {story.author.avatarUrl ? (
                <img src={story.author.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center text-xs font-bold">
                  {story.author.displayName[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold">{story.author.displayName}</div>
                <div className="text-xs text-white/40">Expires in {timeLeft}h</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{story.content}</p>
          </div>
        </div>

        <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-2xl px-2">‹</button>
        <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-2xl px-2">›</button>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white text-lg">✕</button>
      </div>
    </div>
  );
}

interface NewStoryModalProps {
  onClose: () => void;
  onCreated: (story: Story) => void;
}

function NewStoryModal({ onClose, onCreated }: NewStoryModalProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!content.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ data: Story }>("/stories", {
        content: content.trim(),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      });
      onCreated(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create story");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-4">New Story</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's your story? (disappears in 24h)"
          rows={3}
          maxLength={500}
          className="w-full bg-black/30 rounded-xl px-3 py-2 text-sm outline-none resize-none mb-3"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (optional)"
          className="w-full bg-black/30 rounded-xl px-3 py-2 text-sm outline-none mb-3"
        />
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-white/40 hover:text-white px-3 py-1.5">Cancel</button>
          <button
            onClick={submit}
            disabled={isSubmitting || !content.trim()}
            className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 py-1.5 rounded-full disabled:opacity-40"
          >
            {isSubmitting ? "..." : "Share Story"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoriesBar() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api.get<{ data: Story[] }>("/stories/feed").then((r) => setStories(r.data)).catch(() => {});
  }, []);

  if (!user) return null;

  function goNext() {
    setActive((i) => (i === null || i >= stories.length - 1 ? null : i + 1));
  }

  function goPrev() {
    setActive((i) => (i === null || i <= 0 ? null : i - 1));
  }

  const grouped = stories.reduce<Record<string, Story[]>>((acc, s) => {
    const key = s.author.username;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const authors = Object.keys(grouped);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        {/* Add story button */}
        <button
          onClick={() => setShowNew(true)}
          className="flex-shrink-0 flex flex-col items-center gap-1"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-brain-accent/50 flex items-center justify-center text-brain-accent text-2xl hover:border-brain-accent transition-colors">
            +
          </div>
          <span className="text-xs text-white/40">Add</span>
        </button>

        {authors.map((username) => {
          const userStories = grouped[username];
          const first = userStories[0];
          const allViewed = userStories.every((s) => s.viewedByMe);
          const idx = stories.indexOf(userStories[0]);

          return (
            <button
              key={username}
              onClick={() => setActive(idx)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div className={`w-14 h-14 rounded-full p-0.5 ${allViewed ? "bg-white/20" : "bg-gradient-to-r from-brain-accent to-brain-accent2"}`}>
                <div className="w-full h-full rounded-full bg-brain-950 p-0.5">
                  {first.author.avatarUrl ? (
                    <img src={first.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-brain-accent/20 flex items-center justify-center text-sm font-bold">
                      {first.author.displayName[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-white/60 truncate max-w-[56px]">
                {username === user.username ? "You" : first.author.displayName.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {active !== null && stories[active] && (
        <StoryModal
          story={stories[active]}
          onClose={() => setActive(null)}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}

      {showNew && (
        <NewStoryModal
          onClose={() => setShowNew(false)}
          onCreated={(s) => { setStories((prev) => [s, ...prev]); setShowNew(false); }}
        />
      )}
    </>
  );
}
