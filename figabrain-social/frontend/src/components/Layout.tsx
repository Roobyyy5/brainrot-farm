import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex bg-brain-950 bg-brain-glow">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="text-sm text-white/60">Premium Web3 Social Network</div>
          {user && (
            <div className="flex items-center gap-3 glass-panel rounded-full px-4 py-1.5">
              <span className="text-sm font-semibold">{user.displayName}</span>
              <span className="text-xs text-brain-point font-bold">{user.brainPoints.toFixed(1)} BP</span>
            </div>
          )}
        </header>
        <main className="flex-1 p-6 max-w-3xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
