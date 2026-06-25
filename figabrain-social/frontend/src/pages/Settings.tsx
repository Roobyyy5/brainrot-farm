import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saved, setSaved] = useState(false);

  async function save() {
    await api.patch("/users/me", { displayName, bio });
    await refreshUser();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4 max-w-md">
      <h2 className="text-lg font-bold">Profile Settings</h2>
      <div>
        <label className="text-xs text-white/40 block mb-1">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
        />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none resize-none"
        />
      </div>
      <button onClick={save} className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 py-2 rounded-full">
        {saved ? "Saved!" : "Save changes"}
      </button>
      <button onClick={logout} className="block text-xs text-white/40 hover:text-white">
        Log out
      </button>
    </div>
  );
}
