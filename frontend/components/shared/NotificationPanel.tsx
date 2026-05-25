"use client";
import { useState, useEffect } from "react";
import { FiBell } from "react-icons/fi";
import { LuCheckCheck } from "react-icons/lu";
import { getNotifications, markNotificationsRead } from "@/lib/api";
import { getToken } from "@/lib/store";
import { fmtRelative } from "@/lib/formatters";

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getNotifications().then((n) => setNotifications(n ?? [])).catch(() => {});
    const id = setInterval(() => {
      getNotifications().then((n) => setNotifications(n ?? [])).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      markNotificationsRead().then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }).catch(() => {});
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative bg-surface-2 border border-border rounded-[var(--radius-md)] w-9 h-9 flex items-center justify-center cursor-pointer text-text-2 transition-all hover:border-border-bright"
      >
        <FiBell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border-[1.5px] border-surface" />
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-[98]" />
          <div className="absolute top-[calc(100%+8px)] right-0 w-[340px] bg-surface-2 border border-border rounded-[var(--radius-lg)] shadow-lg z-[99] animate-scale-in origin-top-right overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="font-[var(--font-display)] text-xs font-bold text-white tracking-wider uppercase">Notifications</div>
              <LuCheckCheck size={14} className="text-text-3" />
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-7 px-4 text-center text-text-3 text-sm">All clear — no notifications</div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-border ${n.is_read ? "" : "bg-cyan-dim border-l-[3px] border-l-cyan"}`}>
                    <div className="font-semibold text-sm text-text-1 mb-0.5">{n.title}</div>
                    <div className="text-xs text-text-3 mb-1">{n.message}</div>
                    <div className="text-[11px] text-muted font-[var(--font-mono)]">{fmtRelative(n.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
