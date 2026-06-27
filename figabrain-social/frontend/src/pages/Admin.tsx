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
interface Overview { userCount: number; postCount: number; totalBrainPointsIssued: number; bannedCount: number; shadowBannedCount: number }
interface RewardStat { action: string; totalAmount: number; eventCount: number }
interface EconomyStats {
  totalBrainPointsInCirculation: number; totalXpEarned: number; lootBoxesOpened: number;
  boostersActivated: number;
  tokenConversions: { count: number; totalBrainPointsConverted: number; totalFgbIssued: number };
  rankDistribution: { rank: string; count: number }[];
}
interface RetentionStats { dailyActiveUsers: number; weeklyActiveUsers: number; monthlyActiveUsers: number; streakDistribution: { streak: number; count: number }[] }
interface EngagementStats { postsPerUser: number; commentsPerUser: number; likesPerUser: number; repostsPerUser: number; missionsCompleted: number; achievementsUnlocked: number }
interface Report { id: string; targetType: string; targetId: string; reason: string; createdAt: string; filer: { username: string } }
interface AuditLog { id: string; action: string; entity: string; entityId: string | null; createdAt: string }
interface ShadowBanEntry { id: string; userId: string; reason: string | null; createdAt: string; username: string | null }

type Tab = "overview" | "users" | "reports" | "economy" | "retention" | "engagement" | "fraud" | "audit" | "seasons";

export function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rewards, setRewards] = useState<RewardStat[]>([]);
  const [economy, setEconomy] = useState<EconomyStats | null>(null);
  const [retention, setRetention] = useState<RetentionStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [shadowBans, setShadowBans] = useState<ShadowBanEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => { loadTab(tab); }, [tab]);

  async function loadTab(t: Tab) {
    setIsLoading(true);
    try {
      if (t === "overview") {
        const [u, o] = await Promise.all([api.get<{ data: AdminUser[] }>("/admin/users"), api.get<{ data: Overview }>("/admin/analytics/overview")]);
        setUsers(u.data); setOverview(o.data);
      } else if (t === "users") {
        const u = await api.get<{ data: AdminUser[] }>("/admin/users"); setUsers(u.data);
      } else if (t === "reports") {
        const r = await api.get<{ data: Report[] }>("/admin/reports"); setReports(r.data);
      } else if (t === "economy") {
        const [ec, rw] = await Promise.all([api.get<{ data: EconomyStats }>("/admin/analytics/economy"), api.get<{ data: RewardStat[] }>("/admin/analytics/rewards")]);
        setEconomy(ec.data); setRewards(rw.data);
      } else if (t === "retention") {
        const r = await api.get<{ data: RetentionStats }>("/admin/analytics/retention"); setRetention(r.data);
      } else if (t === "engagement") {
        const e = await api.get<{ data: EngagementStats }>("/admin/analytics/engagement"); setEngagement(e.data);
      } else if (t === "fraud") {
        const sb = await api.get<{ data: ShadowBanEntry[] }>("/admin/fraud/shadow-bans"); setShadowBans(sb.data);
      } else if (t === "audit") {
        const a = await api.get<{ data: AuditLog[] }>("/admin/audit-logs?limit=100"); setAuditLogs(a.data);
      }
    } finally { setIsLoading(false); }
  }

  async function ban(id: string, isBanned: boolean) {
    await api.post(`/admin/users/${id}/${isBanned ? "unban" : "ban"}`);
    await loadTab("users");
  }
  async function shadowBan(id: string, isShadowBanned: boolean) {
    await api.post(`/admin/users/${id}/${isShadowBanned ? "shadow-unban" : "shadow-ban"}`);
    await loadTab("users");
  }
  async function removePost(postId: string) {
    await api.post(`/admin/posts/${postId}/remove`);
    await loadTab("reports");
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "reports", label: `Reports${reports.length ? ` (${reports.length})` : ""}` },
    { key: "economy", label: "Economy" },
    { key: "retention", label: "Retention" },
    { key: "engagement", label: "Engagement" },
    { key: "fraud", label: "Fraud" },
    { key: "audit", label: "Audit Log" },
  ];

  const filteredUsers = users.filter((u) =>
    !userSearch || u.username.includes(userSearch) || u.displayName.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === t.key ? "bg-white/15 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="glass-panel rounded-2xl p-8 animate-pulse h-48" />}

      {/* Overview */}
      {!isLoading && tab === "overview" && overview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Metric label="Users" value={overview.userCount} />
            <Metric label="Posts" value={overview.postCount} />
            <Metric label="BP Issued" value={overview.totalBrainPointsIssued.toFixed(0)} />
            <Metric label="Banned" value={overview.bannedCount} color="text-red-400" />
            <Metric label="Shadow banned" value={overview.shadowBannedCount} color="text-yellow-400" />
          </div>
        </div>
      )}

      {/* Users */}
      {!isLoading && tab === "users" && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold">User Management</h2>
            <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filter..." className="ml-auto bg-black/30 rounded-lg px-3 py-1.5 text-xs outline-none w-40" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/40 text-left text-xs">
                <tr><th className="py-2 pr-4">User</th><th className="pr-4">Rank</th><th className="pr-4">BP</th><th className="pr-4">Status</th><th></th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-white/5">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{u.displayName}</div>
                      <div className="text-xs text-white/40">@{u.username}</div>
                    </td>
                    <td className="pr-4 text-xs">{u.rank}</td>
                    <td className="pr-4 text-brain-point font-semibold text-xs">{u.brainPoints.toFixed(1)}</td>
                    <td className="pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.isBanned ? "bg-red-500/20 text-red-400" : u.isShadowBanned ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>
                        {u.isBanned ? "Banned" : u.isShadowBanned ? "Shadow" : "Active"}
                      </span>
                    </td>
                    <td className="text-right space-x-3">
                      <button onClick={() => ban(u.id, u.isBanned)} className="text-xs text-red-400 hover:underline">
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                      <button onClick={() => shadowBan(u.id, u.isShadowBanned)} className="text-xs text-yellow-400 hover:underline">
                        {u.isShadowBanned ? "Unshadow" : "Shadow"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports */}
      {!isLoading && tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-white/40 text-sm text-center py-8">No pending reports. 🎉</p>}
          {reports.map((r) => (
            <div key={r.id} className="glass-panel rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/40 mb-1">
                    <span className="text-white/60">@{r.filer?.username ?? "unknown"}</span> reported {r.targetType.toLowerCase()} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                  <p className="text-sm">{r.reason}</p>
                  <div className="text-xs text-white/30 mt-1 font-mono">{r.targetId}</div>
                </div>
                {r.targetType === "POST" && (
                  <button onClick={() => removePost(r.targetId)} className="text-xs text-red-400 hover:text-red-300 shrink-0 bg-red-500/10 px-3 py-1 rounded-full">
                    Remove post
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Economy */}
      {!isLoading && tab === "economy" && economy && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Metric label="BP in circulation" value={economy.totalBrainPointsInCirculation.toFixed(0)} color="text-brain-point" />
            <Metric label="Total XP earned" value={economy.totalXpEarned.toLocaleString()} />
            <Metric label="Loot boxes opened" value={economy.lootBoxesOpened} />
            <Metric label="Boosters activated" value={economy.boostersActivated} />
            <Metric label="Token conversions" value={economy.tokenConversions.count} />
            <Metric label="BP converted" value={economy.tokenConversions.totalBrainPointsConverted.toFixed(0)} />
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-3">Rank distribution</h3>
            <div className="space-y-2">
              {economy.rankDistribution.map((r) => (
                <div key={r.rank} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-28 capitalize">{r.rank.toLowerCase().replace("_", " ")}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2">
                    <div className="bg-brain-accent h-2 rounded-full" style={{ width: `${Math.min(100, (r.count / (economy.rankDistribution.reduce((a, b) => a + b.count, 0) || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-white/50 w-8 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-3">Rewards (last 7d)</h3>
            <table className="w-full text-xs">
              <thead className="text-white/40"><tr><th className="text-left py-1">Action</th><th className="text-right">Events</th><th className="text-right">Total BP</th></tr></thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r.action} className="border-t border-white/5">
                    <td className="py-1.5">{r.action}</td>
                    <td className="text-right text-white/60">{r.eventCount}</td>
                    <td className="text-right text-brain-point font-semibold">{r.totalAmount.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Retention */}
      {!isLoading && tab === "retention" && retention && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="DAU" value={retention.dailyActiveUsers} color="text-green-400" />
            <Metric label="WAU" value={retention.weeklyActiveUsers} />
            <Metric label="MAU" value={retention.monthlyActiveUsers} />
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-3">Streak distribution</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {retention.streakDistribution.slice(0, 30).map((s) => (
                <div key={s.streak} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-16">{s.streak}d streak</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5">
                    <div className="bg-brain-accent2 h-1.5 rounded-full" style={{ width: `${Math.min(100, (s.count / (retention.streakDistribution[0]?.count || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-white/40 w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Engagement */}
      {!isLoading && tab === "engagement" && engagement && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric label="Posts / user" value={engagement.postsPerUser.toFixed(2)} />
          <Metric label="Comments / user" value={engagement.commentsPerUser.toFixed(2)} />
          <Metric label="Likes / user" value={engagement.likesPerUser.toFixed(2)} />
          <Metric label="Reposts / user" value={engagement.repostsPerUser.toFixed(2)} />
          <Metric label="Missions completed" value={engagement.missionsCompleted} color="text-brain-accent" />
          <Metric label="Achievements unlocked" value={engagement.achievementsUnlocked} color="text-brain-accent2" />
        </div>
      )}

      {/* Fraud */}
      {!isLoading && tab === "fraud" && (
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="text-lg font-bold mb-3">Shadow-banned users</h2>
          {shadowBans.length === 0 && <p className="text-white/40 text-sm">No active shadow bans.</p>}
          <div className="space-y-2">
            {shadowBans.map((sb) => (
              <div key={sb.id} className="flex items-center gap-3 p-2 border-b border-white/5">
                <span className="text-sm font-mono">@{sb.username ?? sb.userId.slice(0, 8)}</span>
                <span className="text-xs text-white/40 flex-1">{sb.reason ?? "No reason"}</span>
                <span className="text-xs text-white/30">{new Date(sb.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log */}
      {!isLoading && tab === "audit" && (
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="text-lg font-bold mb-3">Audit Log</h2>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 text-xs">
                <span className="text-white/30 shrink-0 w-28">{new Date(log.createdAt).toLocaleString()}</span>
                <span className="font-mono text-brain-accent shrink-0">{log.action}</span>
                <span className="text-white/50">{log.entity}</span>
                {log.entityId && <span className="text-white/25 font-mono truncate">{log.entityId.slice(0, 8)}</span>}
              </div>
            ))}
            {auditLogs.length === 0 && <p className="text-white/40 text-sm text-center py-4">No audit logs found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="glass-panel rounded-xl p-3 text-center">
      <div className={`text-xl font-bold ${color ?? "text-white"}`}>{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
