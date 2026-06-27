import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNotificationBadge } from "../context/NotificationBadgeContext";

export function Sidebar() {
  const { t } = useTranslation();
  const { unread } = useNotificationBadge();

  const NAV_ITEMS = [
    { to: "/", label: t("nav.feed") },
    { to: "/search", label: t("nav.search") },
    { to: "/notifications", label: t("nav.notifications") },
    { to: "/messages", label: t("nav.messages") },
    { to: "/wallet", label: t("nav.wallet") },
    { to: "/economy", label: t("nav.economy") },
    { to: "/rewards", label: t("nav.rewards") },
    { to: "/leaderboard", label: t("nav.leaderboard") },
    { to: "/settings", label: t("nav.settings") },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 p-4 gap-1 border-r border-white/5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 px-3"
      >
        <span className="text-xl font-bold bg-gradient-to-r from-brain-accent to-brain-accent2 bg-clip-text text-transparent">
          FIGABRAIN
        </span>
        <span className="block text-xs text-white/40">Social</span>
      </motion.div>

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
              isActive ? "bg-white/10 text-white shadow-glow" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <span>{item.label}</span>
          {item.to === "/notifications" && unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </NavLink>
      ))}
    </aside>
  );
}
