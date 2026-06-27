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
  staking: { activePositions: number; totalStakedFgb: number };
}
interface RetentionStats { dailyActiveUsers: number; weeklyActiveUsers: number; monthlyActiveUsers: number; streakDistribution: { streak: number; count: number }[] }
interface EngagementStats { postsPerUser: number; commentsPerUser: number; likesPerUser: number; repostsPerUser: number; missionsCompleted: number; achievementsUnlocked: number }
interface Report { id: string; targetType: string; targetId: string; reason: string; createdAt: string; filer: { username: string } }
interface AuditLog { id: string; action: string; entity: string; entityId: string | null; createdAt: string }
interface ShadowBanEntry { id: string; userId: string; reason: string | null; createdAt: string; username: string | null }
interface DuplicateDevice { deviceFingerprint: string; _count: { _all: number } }
interface RewardConfig { id: string; action: string; amount: number; xpAmount: number; dailyCap: number | null; cooldownSeconds: number; enabled: boolean }
interface Season { id: string; name: string; startsAt: string; endsAt: string; isActive: boolean }
interface BpPurchaseAdmin { id: string; bpAmount: number; usdAmount: number; cryptoCurrency: string; txHash: string | null; status: string; createdAt: string; adminNote: string | null; user: { username: string; displayName: string } }
interface PaidAirdrop { id: string; name: string; totalAmount: number; perUserAmount: number; startsAt: string; endsAt: string; sponsorName: string; sponsorWebsite: string | null; paymentTxHash: string | null; _count: { claims: number } }

type Tab = "overview" | "users" | "reports" | "economy" | "retention" | "engagement" | "fraud" | "audit" | "seasons" | "rewards-config" | "bp-purchases" | "airdrops" | "announce";

export function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rewards, setRewards] = useState<RewardStat[]>([]);
  const [rewardConfigs, setRewardConfigs] = useState<RewardConfig[]>([]);
  const [economy, setEconomy] = useState<EconomyStats | null>(null);
  const [retention, setRetention] = useState<RetentionStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [shadowBans, setShadowBans] = useState<ShadowBanEntry[]>([]);
  const [duplicateDevices, setDuplicateDevices] = useState<DuplicateDevice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [usersNextCursor, setUsersNextCursor] = useState<string | null>(null);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonDays, setNewSeasonDays] = useState(30);
  const [editingConfig, setEditingConfig] = useState<{ action: string; field: string; value: string } | null>(null);

  // Monetization state
  const [bpPurchases, setBpPurchases] = useState<BpPurchaseAdmin[]>([]);
  const [paidAirdrops, setPaidAirdrops] = useState<PaidAirdrop[]>([]);
  const [announceText, setAnnounceText] = useState("");
  const [announceParseMode, setAnnounceParseMode] = useState<"HTML" | "Markdown" | "">("");
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [announceResult, setAnnounceResult] = useState<string | null>(null);
  const [airdropForm, setAirdropForm] = useState({ name: "", totalAmount: "", perUserAmount: "", startsAt: "", endsAt: "", eligibleUserIds: "", sponsorName: "", sponsorWebsite: "", paymentTxHash: "" });
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [airdropResult, setAirdropResult] = useState<string | null>(null);

  useEffect(() => { loadTab(tab); }, [tab]);

  async function loadTab(t: Tab) {
    setIsLoading(true);
    try {
      if (t === "overview") {
        const [u, o] = await Promise.all([api.get<{ data: AdminUser[]; nextCursor: string | null }>("/admin/users"), api.get<{ data: Overview }>("/admin/analytics/overview")]);
        setUsers(u.data); setUsersNextCursor(u.nextCursor); setOverview(o.data);
      } else if (t === "users") {
        const u = await api.get<{ data: AdminUser[]; nextCursor: string | null }>("/admin/users"); setUsers(u.data); setUsersNextCursor(u.nextCursor);
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
        const [sb, dd] = await Promise.all([
          api.get<{ data: ShadowBanEntry[] }>("/admin/fraud/shadow-bans"),
          api.get<{ data: DuplicateDevice[] }>("/admin/fraud/duplicate-devices"),
        ]);
        setShadowBans(sb.data); setDuplicateDevices(dd.data);
      } else if (t === "audit") {
        const a = await api.get<{ data: AuditLog[] }>("/admin/audit-logs?limit=100"); setAuditLogs(a.data);
      } else if (t === "seasons") {
        const s = await api.get<{ data: Season[] }>("/admin/seasons"); setSeasons(s.data);
      } else if (t === "rewards-config") {
        const rc = await api.get<{ data: RewardConfig[] }>("/rewards/config"); setRewardConfigs(rc.data);
      } else if (t === "bp-purchases") {
        const p = await api.get<{ data: BpPurchaseAdmin[] }>("/bp-purchase/admin/pending"); setBpPurchases(p.data);
      } else if (t === "airdrops") {
        const a = await api.get<{ data: PaidAirdrop[] }>("/admin/paid-airdrops"); setPaidAirdrops(a.data);
      } else if (t === "announce") {
        // nothing to preload
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
  async function resolveReport(reportId: string) {
    await api.post(`/admin/reports/${reportId}/resolve`, {});
    await loadTab("reports");
  }
  async function loadMoreUsers() {
    if (!usersNextCursor) return;
    setIsLoadingMoreUsers(true);
    try {
      const u = await api.get<{ data: AdminUser[]; nextCursor: string | null }>(`/admin/users?cursor=${usersNextCursor}`);
      setUsers((prev) => [...prev, ...u.data]);
      setUsersNextCursor(u.nextCursor);
    } finally { setIsLoadingMoreUsers(false); }
  }
  async function startSeason() {
    if (!newSeasonName.trim()) return;
    await api.post("/admin/seasons", { name: newSeasonName.trim(), durationDays: newSeasonDays });
    setNewSeasonName(""); await loadTab("seasons");
  }
  async function endSeason(id: string) {
    if (!confirm("End this season? This will distribute rewards.")) return;
    await api.post(`/admin/seasons/${id}/end`);
    await loadTab("seasons");
  }
  async function saveRewardConfig(action: string, field: string, raw: string) {
    const value = field === "enabled" ? raw === "true" : Number(raw);
    await api.put(`/admin/reward-config/${action}`, { [field]: value });
    setEditingConfig(null);
    await loadTab("rewards-config");
  }

  async function approveBpPurchase(id: string) {
    await api.post(`/bp-purchase/admin/${id}/approve`, {});
    await loadTab("bp-purchases");
  }
  async function rejectBpPurchase(id: string) {
    const note = prompt("Rejection reason (optional):");
    await api.post(`/bp-purchase/admin/${id}/reject`, { adminNote: note ?? undefined });
    await loadTab("bp-purchases");
  }
  async function sendAnnouncement() {
    if (!announceText.trim()) return;
    setAnnounceLoading(true); setAnnounceResult(null);
    try {
      await api.post("/admin/bot-announce", { text: announceText.trim(), ...(announceParseMode ? { parseMode: announceParseMode } : {}) });
      setAnnounceResult("✓ Sent successfully");
      setAnnounceText("");
    } catch (e: unknown) {
      setAnnounceResult(`Error: ${(e as Error).message}`);
    } finally {
      setAnnounceLoading(false);
    }
  }
  async function createPaidAirdrop() {
    setAirdropLoading(true); setAirdropResult(null);
    try {
      const eligibleUserIds = airdropForm.eligibleUserIds
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post("/admin/paid-airdrops", {
        name: airdropForm.name,
        totalAmount: Number(airdropForm.totalAmount),
        perUserAmount: Number(airdropForm.perUserAmount),
        startsAt: new Date(airdropForm.startsAt).toISOString(),
        endsAt: new Date(airdropForm.endsAt).toISOString(),
        eligibleUserIds,
        sponsorName: airdropForm.sponsorName || undefined,
        sponsorWebsite: airdropForm.sponsorWebsite || undefined,
        paymentTxHash: airdropForm.paymentTxHash || undefined,
      });
      setAirdropResult("✓ Airdrop campaign created");
      setAirdropForm({ name: "", totalAmount: "", perUserAmount: "", startsAt: "", endsAt: "", eligibleUserIds: "", sponsorName: "", sponsorWebsite: "", paymentTxHash: "" });
      await loadTab("airdrops");
    } catch (e: unknown) {
      setAirdropResult(`Error: ${(e as Error).message}`);
    } finally {
      setAirdropLoading(false);
    }
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
    { key: "seasons", label: "Seasons" },
    { key: "rewards-config", label: "Reward Config" },
    { key: "bp-purchases", label: `BP Purchases${bpPurchases.length ? ` (${bpPurchases.length})` : ""}` },
    { key: "airdrops", label: "Paid Airdrops" },
    { key: "announce", label: "Bot Announce" },
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
          {usersNextCursor && (
            <button
              onClick={loadMoreUsers}
              disabled={isLoadingMoreUsers}
              className="mt-3 w-full text-xs text-white/40 hover:text-white py-2"
            >
              {isLoadingMoreUsers ? "Loading..." : "Load more users"}
            </button>
          )}
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
                <div className="flex flex-col gap-1 shrink-0">
                  {r.targetType === "POST" && (
                    <button onClick={() => removePost(r.targetId)} className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1 rounded-full">
                      Remove post
                    </button>
                  )}
                  <button onClick={() => resolveReport(r.id)} className="text-xs text-white/40 hover:text-white bg-white/5 px-3 py-1 rounded-full">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Economy */}
      {!isLoading && tab === "economy" && economy && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="BP in circulation" value={economy.totalBrainPointsInCirculation.toFixed(0)} color="text-brain-point" />
            <Metric label="Total XP earned" value={economy.totalXpEarned.toLocaleString()} />
            <Metric label="Loot boxes opened" value={economy.lootBoxesOpened} />
            <Metric label="Boosters activated" value={economy.boostersActivated} />
            <Metric label="Token conversions" value={economy.tokenConversions.count} />
            <Metric label="BP converted" value={economy.tokenConversions.totalBrainPointsConverted.toFixed(0)} />
            {economy.staking && <>
              <Metric label="Active stakes" value={economy.staking.activePositions} color="text-brain-accent2" />
              <Metric label="FGB staked" value={economy.staking.totalStakedFgb.toFixed(2)} color="text-brain-accent2" />
            </>}
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
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-4">
            <h2 className="text-base font-bold mb-3">Shadow-banned users</h2>
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
          <div className="glass-panel rounded-2xl p-4">
            <h2 className="text-base font-bold mb-1">Duplicate Devices</h2>
            <p className="text-xs text-white/40 mb-3">Fingerprints shared by multiple accounts — potential multi-account abuse.</p>
            {duplicateDevices.length === 0 && <p className="text-white/40 text-sm">No duplicate devices detected.</p>}
            <div className="space-y-2">
              {duplicateDevices.map((d) => (
                <div key={d.deviceFingerprint} className="flex items-center gap-3 p-2 border-b border-white/5">
                  <span className="text-xs font-mono text-yellow-400 flex-1 truncate">{d.deviceFingerprint}</span>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{d._count._all} accounts</span>
                </div>
              ))}
            </div>
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

      {/* Seasons */}
      {!isLoading && tab === "seasons" && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-4">
            <h2 className="text-base font-bold mb-3">Start New Season</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="Season name..."
                className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-sm outline-none min-w-40"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newSeasonDays}
                  onChange={(e) => setNewSeasonDays(Number(e.target.value))}
                  min={1} max={365}
                  className="w-20 bg-black/30 rounded-xl px-3 py-2 text-sm outline-none text-center"
                />
                <span className="text-xs text-white/40">days</span>
              </div>
              <button
                onClick={startSeason}
                disabled={!newSeasonName.trim()}
                className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-40"
              >
                Start Season
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {seasons.length === 0 && <p className="text-white/40 text-sm text-center py-4">No seasons yet.</p>}
            {seasons.map((s) => (
              <div key={s.id} className="glass-panel rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-white/40">
                    {new Date(s.startsAt).toLocaleDateString()} → {new Date(s.endsAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/30"}`}>
                  {s.isActive ? "Active" : "Ended"}
                </span>
                {s.isActive && (
                  <button onClick={() => endSeason(s.id)} className="text-xs text-red-400 hover:underline">End season</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reward Config */}
      {!isLoading && tab === "rewards-config" && (
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="text-lg font-bold mb-1">Reward Config</h2>
          <p className="text-xs text-white/40 mb-4">Edit live — changes take effect immediately.</p>
          <table className="w-full text-xs">
            <thead className="text-white/40 text-left">
              <tr>
                <th className="py-2 pr-3">Action</th>
                <th className="pr-3">BP Amount</th>
                <th className="pr-3">Daily Cap</th>
                <th className="pr-3">Cooldown (s)</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {rewardConfigs.map((rc) => (
                <tr key={rc.action} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-mono text-white/70">{rc.action}</td>
                  {(["amount", "dailyCap", "cooldownSeconds", "enabled"] as const).map((field) => {
                    const isEditing = editingConfig?.action === rc.action && editingConfig?.field === field;
                    const display = field === "enabled" ? (rc[field] ? "✓" : "✗") : (rc[field] ?? "—");
                    return (
                      <td key={field} className="pr-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <input
                              autoFocus
                              defaultValue={String(rc[field] ?? "")}
                              onChange={(e) => setEditingConfig({ ...editingConfig!, value: e.target.value })}
                              className="w-20 bg-black/50 rounded px-1.5 py-0.5 outline-none text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRewardConfig(rc.action, field, editingConfig!.value ?? String(rc[field]));
                                if (e.key === "Escape") setEditingConfig(null);
                              }}
                            />
                            <button onClick={() => saveRewardConfig(rc.action, field, editingConfig!.value ?? String(rc[field]))} className="text-green-400 hover:text-green-300">✓</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingConfig({ action: rc.action, field, value: String(rc[field] ?? "") })}
                            className={`px-2 py-0.5 rounded hover:bg-white/10 transition-colors ${field === "enabled" ? (rc.enabled ? "text-green-400" : "text-red-400") : "text-white/70"}`}
                          >
                            {String(display)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-white/25 mt-3">Click any cell to edit. Press Enter to save, Esc to cancel.</p>
        </div>
      )}
      {/* BP Purchases */}
      {!isLoading && tab === "bp-purchases" && (
        <div className="space-y-3">
          <div className="glass-panel rounded-2xl p-4">
            <h2 className="text-base font-bold mb-3">Pending BP Purchases</h2>
            {bpPurchases.length === 0 && <p className="text-white/40 text-sm text-center py-4">No pending purchases.</p>}
            <div className="space-y-2">
              {bpPurchases.map((p) => (
                <div key={p.id} className="bg-black/20 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">@{p.user.username} <span className="text-white/40 font-normal">({p.user.displayName})</span></div>
                      <div className="text-xs text-brain-point font-bold mt-0.5">+{p.bpAmount.toLocaleString()} BP · ${p.usdAmount} · {p.cryptoCurrency}</div>
                      <div className={`text-xs mt-0.5 ${p.status === "SUBMITTED" ? "text-yellow-400" : "text-white/40"}`}>{p.status}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => approveBpPurchase(p.id)} className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-semibold">Approve</button>
                      <button onClick={() => rejectBpPurchase(p.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-semibold">Reject</button>
                    </div>
                  </div>
                  {p.txHash && (
                    <div className="text-xs font-mono text-white/30 break-all border-t border-white/5 pt-2">TX: {p.txHash}</div>
                  )}
                  <div className="text-xs text-white/25">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paid Airdrops */}
      {!isLoading && tab === "airdrops" && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-4">
            <h2 className="text-base font-bold mb-3">Create Paid Airdrop Campaign</h2>
            <div className="space-y-2">
              {[
                { field: "name", placeholder: "Campaign name", label: "Name" },
                { field: "sponsorName", placeholder: "Sponsor project name", label: "Sponsor" },
                { field: "sponsorWebsite", placeholder: "https://...", label: "Sponsor website" },
                { field: "paymentTxHash", placeholder: "Payment TX hash", label: "Payment TX" },
                { field: "totalAmount", placeholder: "Total FGB amount", label: "Total FGB" },
                { field: "perUserAmount", placeholder: "Per-user FGB amount", label: "Per user FGB" },
              ].map(({ field, placeholder, label }) => (
                <div key={field} className="flex items-center gap-3">
                  <label className="text-xs text-white/40 w-28 shrink-0">{label}</label>
                  <input
                    value={airdropForm[field as keyof typeof airdropForm]}
                    onChange={(e) => setAirdropForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/40 w-28 shrink-0">Starts at</label>
                <input type="datetime-local" value={airdropForm.startsAt} onChange={(e) => setAirdropForm((f) => ({ ...f, startsAt: e.target.value }))} className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/40 w-28 shrink-0">Ends at</label>
                <input type="datetime-local" value={airdropForm.endsAt} onChange={(e) => setAirdropForm((f) => ({ ...f, endsAt: e.target.value }))} className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-start gap-3">
                <label className="text-xs text-white/40 w-28 shrink-0 pt-2">User IDs</label>
                <textarea
                  value={airdropForm.eligibleUserIds}
                  onChange={(e) => setAirdropForm((f) => ({ ...f, eligibleUserIds: e.target.value }))}
                  placeholder="UUID per line or comma-separated"
                  rows={3}
                  className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-xs font-mono outline-none resize-none"
                />
              </div>
              {airdropResult && <p className={`text-xs ${airdropResult.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{airdropResult}</p>}
              <button onClick={createPaidAirdrop} disabled={airdropLoading || !airdropForm.name || !airdropForm.totalAmount} className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-bold py-2.5 rounded-xl disabled:opacity-40">
                {airdropLoading ? "..." : "Create Campaign"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {paidAirdrops.map((a) => (
              <div key={a.id} className="glass-panel rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{a.name}</div>
                    {a.sponsorName && <div className="text-xs text-white/40">Sponsor: {a.sponsorName}</div>}
                  </div>
                  <span className="text-xs text-white/30">{a._count.claims} claims</span>
                </div>
                <div className="text-xs text-brain-accent2 mt-1">{Number(a.perUserAmount).toFixed(2)} FGB per user · {Number(a.totalAmount).toFixed(2)} FGB total</div>
                <div className="text-xs text-white/25 mt-1">{new Date(a.startsAt).toLocaleDateString()} – {new Date(a.endsAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bot Announce */}
      {!isLoading && tab === "announce" && (
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-bold">Send Bot Announcement</h2>
          <p className="text-xs text-white/40">Message will be sent to the configured Telegram channel via the bot.</p>
          <textarea
            value={announceText}
            onChange={(e) => { setAnnounceText(e.target.value); setAnnounceResult(null); }}
            placeholder="Enter announcement text..."
            rows={6}
            className="w-full bg-black/30 rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/40">Format:</label>
            <select value={announceParseMode} onChange={(e) => setAnnounceParseMode(e.target.value as typeof announceParseMode)} className="bg-black/30 rounded-xl px-3 py-1.5 text-sm outline-none appearance-none">
              <option value="">Plain text</option>
              <option value="HTML">HTML</option>
              <option value="Markdown">Markdown</option>
            </select>
            <span className="text-xs text-white/25">{announceText.length}/4096</span>
          </div>
          {announceResult && <p className={`text-xs ${announceResult.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{announceResult}</p>}
          <button
            onClick={sendAnnouncement}
            disabled={announceLoading || !announceText.trim()}
            className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-bold py-2.5 rounded-xl disabled:opacity-40"
          >
            {announceLoading ? "Sending..." : "Send Announcement"}
          </button>
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
