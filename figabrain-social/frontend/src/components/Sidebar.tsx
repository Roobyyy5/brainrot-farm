import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNotificationBadge } from "../context/NotificationBadgeContext";
import { TrendingHashtags } from "./TrendingHashtags";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export function Sidebar() {
  const { t } = useTranslation();
  const { unread } = useNotificationBadge();

  const NAV_ITEMS: NavItem[] = [
    { to: "/", label: t("nav.feed"), icon: "🏠", exact: true },
    { to: "/tap", label: t("nav.tap"), icon: "🧠" },
    { to: "/search", label: t("nav.search"), icon: "🔍" },
    { to: "/notifications", label: t("nav.notifications"), icon: "🔔" },
    { to: "/messages", label: t("nav.messages"), icon: "✉️" },
    { to: "/bookmarks", label: t("nav.bookmarks"), icon: "🔖" },
    { to: "/wallet", label: t("nav.wallet"), icon: "💎" },
    { to: "/economy", label: t("nav.economy"), icon: "⚡" },
    { to: "/rewards", label: t("nav.rewards"), icon: "🎁" },
    { to: "/leaderboard", label: t("nav.leaderboard"), icon: "🏆" },
    { to: "/news", label: t("nav.news"), icon: "📰" },
    { to: "/governance", label: t("nav.governance"), icon: "⚖️" },
    { to: "/settings", label: t("nav.settings"), icon: "⚙️" },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 p-3 border-r border-white/5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 px-3 pt-2"
      >
        <span className="text-xl font-bold bg-gradient-to-r from-brain-accent to-brain-accent2 bg-clip-text text-transparent">
          FIGABRAIN
        </span>
        <span className="block text-xs text-white/40">Social</span>
      </motion.div>

      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 justify-between ${
                isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-2.5">
              <span className="text-base leading-none w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </span>
            {item.to === "/notifications" && unread > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 pt-4 border-t border-white/5">
        <TrendingHashtags />
      </div>
    </aside>
  );
}
