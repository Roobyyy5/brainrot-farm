import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { Feed } from "./pages/Feed";
import { Profile } from "./pages/Profile";
import { Wallet } from "./pages/Wallet";
import { Notifications } from "./pages/Notifications";
import { Messages } from "./pages/Messages";
import { Leaderboard } from "./pages/Leaderboard";
import { Rewards } from "./pages/Rewards";
import { Settings } from "./pages/Settings";
import { Search } from "./pages/Search";
import { Admin } from "./pages/Admin";
import { Login } from "./pages/Login";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white/40">Loading FIGABRAIN...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedLayout><Feed /></ProtectedLayout>} />
      <Route path="/u/:username" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
      <Route path="/wallet" element={<ProtectedLayout><Wallet /></ProtectedLayout>} />
      <Route path="/notifications" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />
      <Route path="/messages" element={<ProtectedLayout><Messages /></ProtectedLayout>} />
      <Route path="/leaderboard" element={<ProtectedLayout><Leaderboard /></ProtectedLayout>} />
      <Route path="/rewards" element={<ProtectedLayout><Rewards /></ProtectedLayout>} />
      <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
      <Route path="/search" element={<ProtectedLayout><Search /></ProtectedLayout>} />
      <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
