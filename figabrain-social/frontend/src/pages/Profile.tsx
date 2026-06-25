import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import type { UserProfile } from "../api/types";

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!username) return;
    api.get<{ data: UserProfile }>(`/users/${username}`).then((res) => setProfile(res.data));
  }, [username]);

  async function toggleFollow() {
    if (!profile) return;
    if (profile.isFollowedByMe) {
      await api.delete(`/users/${profile.username}/follow`);
    } else {
      await api.post(`/users/${profile.username}/follow`);
    }
    setProfile({ ...profile, isFollowedByMe: !profile.isFollowedByMe });
  }

  if (!profile) return <p className="text-white/40 text-sm">Loading profile...</p>;

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center text-2xl font-bold">
          {profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">{profile.displayName}</h1>
          <p className="text-white/40">@{profile.username} · {profile.rank}</p>
        </div>
        <button
          onClick={toggleFollow}
          className="ml-auto bg-white/10 hover:bg-white/20 text-sm font-semibold px-4 py-2 rounded-full"
        >
          {profile.isFollowedByMe ? "Unfollow" : "Follow"}
        </button>
      </div>

      <p className="text-sm text-white/70 mb-4">{profile.bio || "No bio yet."}</p>

      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        <Stat label="Posts" value={profile.postsCount} />
        <Stat label="Followers" value={profile.followersCount} />
        <Stat label="Following" value={profile.followingCount} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brain-point/10 border border-brain-point/30 rounded-xl p-3">
          <div className="text-xs text-white/50">Brain Points</div>
          <div className="text-lg font-bold text-brain-point">{profile.brainPoints.toFixed(2)}</div>
        </div>
        <div className="bg-brain-accent2/10 border border-brain-accent2/30 rounded-xl p-3">
          <div className="text-xs text-white/50">Wallet Balance</div>
          <div className="text-lg font-bold text-brain-accent2">{profile.walletBalance.toFixed(4)}</div>
        </div>
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
