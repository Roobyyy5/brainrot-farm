import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  brainPoints: number;
  rank: string;
  isBanned: boolean;
  isShadowBanned: boolean;
}

interface Overview {
  userCount: number;
  postCount: number;
  totalBrainPointsIssued: number;
  bannedCount: number;
  shadowBannedCount: number;
}

export function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);

  async function load() {
    const [u, o] = await Promise.all([
      api.get<{ data: AdminUser[] }>("/admin/users"),
      api.get<{ data: Overview }>("/admin/analytics/overview"),
    ]);
    setUsers(u.data);
    setOverview(o.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function ban(id: string, banned: boolean) {
    await api.post(`/admin/users/${id}/${banned ? "unban" : "ban"}`);
    await load();
  }

  async function shadowBan(id: string, shadowed: boolean) {
    await api.post(`/admin/users/${id}/${shadowed ? "shadow-unban" : "shadow-ban"}`);
    await load();
  }

  return (
    <div className="space-y-6">
      {overview && (
        <div className="grid grid-cols-5 gap-3">
          <Metric label="Users" value={overview.userCount} />
          <Metric label="Posts" value={overview.postCount} />
          <Metric label="BP Issued" value={overview.totalBrainPointsIssued.toFixed(0)} />
          <Metric label="Banned" value={overview.bannedCount} />
          <Metric label="Shadow banned" value={overview.shadowBannedCount} />
        </div>
      )}

      <div className="glass-panel rounded-2xl p-4">
        <h2 className="text-lg font-bold mb-3">User Management</h2>
        <table className="w-full text-sm">
          <thead className="text-white/40 text-left">
            <tr>
              <th className="py-2">User</th>
              <th>Rank</th>
              <th>BP</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="py-2">@{u.username}</td>
                <td>{u.rank}</td>
                <td>{u.brainPoints.toFixed(1)}</td>
                <td>{u.isBanned ? "Banned" : u.isShadowBanned ? "Shadowed" : "Active"}</td>
                <td className="text-right space-x-2">
                  <button onClick={() => ban(u.id, u.isBanned)} className="text-xs text-red-400 hover:underline">
                    {u.isBanned ? "Unban" : "Ban"}
                  </button>
                  <button onClick={() => shadowBan(u.id, u.isShadowBanned)} className="text-xs text-yellow-400 hover:underline">
                    {u.isShadowBanned ? "Unshadow" : "Shadow ban"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass-panel rounded-xl p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}
