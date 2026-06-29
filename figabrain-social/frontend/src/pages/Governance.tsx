import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { GovernanceProposal } from "../api/types";

function ProposalCard({ proposal: initial }: { proposal: GovernanceProposal }) {
  const { user } = useAuth();
  const [proposal, setProposal] = useState(initial);
  const [isVoting, setIsVoting] = useState(false);

  const total = Object.values(proposal.tally ?? {}).reduce((a, b) => a + b, 0);
  const isActive = proposal.status === "ACTIVE" && new Date(proposal.endsAt) > new Date();

  async function vote(choice: "YES" | "NO" | "ABSTAIN") {
    if (!user || !isActive) return;
    setIsVoting(true);
    try {
      await api.post(`/governance/proposals/${proposal.id}/vote`, { choice });
      const res = await api.get<{ data: GovernanceProposal }>(`/governance/proposals/${proposal.id}`);
      setProposal(res.data);
    } catch { /* ignore */ } finally {
      setIsVoting(false);
    }
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(proposal.endsAt).getTime() - Date.now()) / 86400000));

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-bold text-base">{proposal.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isActive ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>
          {isActive ? `${daysLeft}d left` : "Closed"}
        </span>
      </div>

      <p className="text-sm text-white/60 leading-relaxed mb-4">{proposal.description}</p>

      {/* Tally bars */}
      {total > 0 && (
        <div className="space-y-2 mb-4">
          {["YES", "NO", "ABSTAIN"].map((choice) => {
            const votes = proposal.tally?.[choice] ?? 0;
            const pct = total > 0 ? (votes / total) * 100 : 0;
            return (
              <div key={choice}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={choice === "YES" ? "text-green-400" : choice === "NO" ? "text-red-400" : "text-white/40"}>
                    {choice}
                  </span>
                  <span className="text-white/40">{pct.toFixed(1)}% ({votes.toFixed(0)} VP)</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${choice === "YES" ? "bg-green-500" : choice === "NO" ? "bg-red-500" : "bg-white/20"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vote buttons */}
      {user && isActive && (
        <div className="flex gap-2">
          {(["YES", "NO", "ABSTAIN"] as const).map((choice) => (
            <button
              key={choice}
              onClick={() => vote(choice)}
              disabled={isVoting}
              className={`flex-1 text-sm py-2 rounded-xl font-semibold transition-all disabled:opacity-50 ${
                proposal.myVote === choice
                  ? choice === "YES" ? "bg-green-500/30 text-green-400 border border-green-500/50"
                  : choice === "NO" ? "bg-red-500/30 text-red-400 border border-red-500/50"
                  : "bg-white/10 text-white/60 border border-white/20"
                  : choice === "YES" ? "bg-white/5 hover:bg-green-500/20 hover:text-green-400"
                  : choice === "NO" ? "bg-white/5 hover:bg-red-500/20 hover:text-red-400"
                  : "bg-white/5 hover:bg-white/10 text-white/50"
              }`}
            >
              {choice === "YES" ? "✓ Yes" : choice === "NO" ? "✗ No" : "— Abstain"}
            </button>
          ))}
        </div>
      )}

      {proposal.myVote && (
        <p className="text-xs text-white/30 mt-2 text-center">You voted: {proposal.myVote}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-xs text-white/30">by @{proposal.author.username}</span>
        <span className="text-xs text-white/30">{total.toFixed(0)} voting power cast</span>
      </div>
    </div>
  );
}

export function Governance() {
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: GovernanceProposal[] }>("/governance/proposals")
      .then((r) => setProposals(r.data))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Governance</h1>
          <p className="text-sm text-white/40 mt-1">Vote on proposals with your Brain Points</p>
        </div>
      </div>

      {/* Info card */}
      <div className="glass-panel rounded-2xl p-4 mb-6 border border-brain-accent/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h3 className="font-semibold text-sm mb-1">How voting works</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Your voting power equals your Brain Points balance (capped at 1,000 VP).
              Vote YES, NO, or ABSTAIN on active proposals. Proposals are decided by the majority of voting power cast.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="glass-panel rounded-2xl p-5 h-48 animate-pulse" />)}
        </div>
      ) : proposals.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">⚖️</div>
          <p className="text-white/40 text-sm">No governance proposals yet.</p>
          <p className="text-white/30 text-xs mt-1">Proposals are created by the FIGABRAIN team.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => <ProposalCard key={p.id} proposal={p} />)}
        </div>
      )}
    </div>
  );
}
