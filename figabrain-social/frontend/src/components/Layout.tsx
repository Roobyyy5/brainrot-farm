import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { PriceTicker } from "./PriceTicker";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex bg-brain-950 bg-brain-glow">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 px-4 lg:px-6 py-3 border-b border-white/5">
          <PriceTicker />
          {user && (
            <Link
              to={`/u/${user.username}`}
              className="flex items-center gap-2 glass-panel rounded-full px-3 py-1.5 hover:bg-white/10 transition-colors shrink-0"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brain-accent to-brain-accent2 flex items-center justify-center text-xs font-bold">
                  {user.displayName[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold hidden sm:block">{user.displayName}</span>
              <span className="text-xs text-brain-point font-bold">{user.brainPoints.toFixed(1)} BP</span>
            </Link>
          )}
        </header>
        {/* pb-20 ensures content isn't hidden under the mobile bottom nav */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl w-full mx-auto">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
