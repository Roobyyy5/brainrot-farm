import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Post, UserProfile } from "../api/types";
import { RankCard } from "../components/RankCard";
import { PostCard } from "../components/PostCard";
import { useRewardToast } from "../context/RewardToastContext";
import { useAuth } from "../context/AuthContext";

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const { t } = useTranslation();
  const { user: me, refreshUser } = useAuth();
  const { showReward } = useRewardToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (!username) return;
    setProfile(null);
    setPosts([]);
    setNextCursor(null);
    api.get<{ data: UserProfile }>(`/users/${username}`).then((res) => setProfile(res.data));
    loadPosts(username);
  }, [username]);

  async function loadPosts(uname: string, cursor?: string) {
    const params = new URLSearchParams({ limit: "15" });
    if (cursor) params.set("cursor", cursor);
    const res = await api.get<{ data: Post[]; nextCursor: string | null }>(`/users/${uname}/posts?${params}`);
    if (cursor) {
      setPosts((prev) => [...prev, ...res.data]);
    } else {
      setPosts(res.data);
    }
    setNextCursor(res.nextCursor);
  }

  async function loadMore() {
    if (!username || !nextCursor) return;
    setIsLoadingMore(true);
    try { await loadPosts(username, nextCursor); } finally { setIsLoadingMore(false); }
  }

  async function toggleFollow() {
    if (!profile || isFollowLoading) return;
    const wasFollowing = profile.isFollowedByMe;
    setProfile({ ...profile, isFollowedByMe: !wasFollowing, followersCount: profile.followersCount + (wasFollowing ? -1 : 1) });
    setIsFollowLoading(true);
    try {
      if (wasFollowing) {
        await api.delete(`/users/${profile.username}/follow`);
      } else {
        await api.post(`/users/${profile.username}/follow`);
      }
    } catch {
      setProfile({ ...profile, isFollowedByMe: wasFollowing, followersCount: profile.followersCount });
    } finally {
      setIsFollowLoading(false);
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
    try { await api.post(`/posts/${post.id}/repost`); if (username) await loadPosts(username); } catch { /* ignore */ }
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="glass-panel rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-white/10 rounded w-40" />
              <div className="h-3 bg-white/5 rounded w-28" />
            </div>
          </div>
          <div className="h-3 bg-white/5 rounded w-3/4 mb-4" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1,2,3].map((i) => <div key={i} className="h-10 bg-white/5 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1,2].map((i) => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
          </div>
          <div className="h-14 bg-white/5 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="glass-panel rounded-2xl h-28 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const isOwnProfile = me?.username === profile.username;

  return (
    <div>
      <div className="glass-panel rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center text-2xl font-bold">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile.displayName}</h1>
            <p className="text-white/40 text-sm">@{profile.username} · <span className="capitalize">{profile.rank.toLowerCase().replace("_", " ")}</span></p>
          </div>
          {!isOwnProfile && (
            <button
              onClick={toggleFollow}
              disabled={isFollowLoading}
              className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50 transition-colors ${
                profile.isFollowedByMe
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-gradient-to-r from-brain-accent to-brain-accent2"
              }`}
            >
              {profile.isFollowedByMe ? t("profile.unfollow") : t("profile.follow")}
            </button>
          )}
        </div>

        <p className="text-sm text-white/70 mb-4">{profile.bio || "No bio yet."}</p>

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <Stat label={t("profile.posts")} value={profile.postsCount} />
          <Stat label={t("profile.followers")} value={profile.followersCount} />
          <Stat label={t("profile.following")} value={profile.followingCount} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-brain-point/10 border border-brain-point/30 rounded-xl p-3">
            <div className="text-xs text-white/50">{t("profile.brainPoints")}</div>
            <div className="text-lg font-bold text-brain-point">{profile.brainPoints.toFixed(2)}</div>
          </div>
          <div className="bg-brain-accent2/10 border border-brain-accent2/30 rounded-xl p-3">
            <div className="text-xs text-white/50">{t("profile.reputation")}</div>
            <div className="text-lg font-bold text-brain-accent2">{profile.reputation}</div>
          </div>
        </div>

        <RankCard profile={profile} />
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">{t("profile.posts")}</h2>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={handleLike} onRepost={handleRepost} />
        ))}
        {posts.length === 0 && (
          <p className="text-white/30 text-sm text-center py-8">No posts yet.</p>
        )}
        {nextCursor && (
          <button onClick={loadMore} disabled={isLoadingMore} className="w-full text-xs text-white/40 hover:text-white py-3">
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}
