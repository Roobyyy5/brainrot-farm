import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNotificationBadge } from "../context/NotificationBadgeContext";

const ITEMS = [
  { to: "/", icon: "🏠", key: "feed" },
  { to: "/search", icon: "🔍", key: "search" },
  { to: "/notifications", icon: "🔔", key: "notifications" },
  { to: "/messages", icon: "✉️", key: "messages" },
  { to: "/economy", icon: "⚡", key: "economy" },
];

export function BottomNav() {
  const { t } = useTranslation();
  const { unread } = useNotificationBadge();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-brain-950/95 backdrop-blur border-t border-white/5 flex">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors relative ${
              isActive ? "text-brain-accent" : "text-white/40"
            }`
          }
        >
          <span className="text-xl leading-none relative">
            {item.icon}
            {item.key === "notifications" && unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
          <span className="leading-none">{t(`nav.${item.key}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
