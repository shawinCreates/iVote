"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiLogOut, FiHome, FiUsers, FiCheckSquare, FiBarChart2, FiUser,
  FiGrid, FiCalendar, FiUserCheck, FiShield, FiChevronsLeft, FiChevronsRight,
  FiSun, FiMoon,
} from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { initials } from "@/lib/formatters";
import ProtectedImage from "@/components/shared/ProtectedImage";
import NotificationPanel from "@/components/shared/NotificationPanel";
import StarField from "@/components/shared/StarField";
import toast from "react-hot-toast";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard", "/admin/students": "Students", "/admin/elections": "Elections",
  "/admin/candidates": "Candidates", "/admin/results": "Results", "/admin/audit": "Audit Logs",
  "/student/dashboard": "Dashboard", "/student/candidates": "Candidates", "/student/vote": "Cast Vote",
  "/student/results": "Results", "/student/candidacy": "My Candidacy",
};

const ADMIN_NAV = [
  { section: "Overview", items: [{ path: "/admin/dashboard", label: "Dashboard", Icon: FiGrid }] },
  { section: "Management", items: [
    { path: "/admin/students", label: "Students", Icon: FiUsers },
    { path: "/admin/elections", label: "Elections", Icon: FiCalendar },
    { path: "/admin/candidates", label: "Candidates", Icon: FiUserCheck },
    { path: "/admin/results", label: "Results", Icon: FiBarChart2 },
  ]},
  { section: "System", items: [{ path: "/admin/audit", label: "Audit Logs", Icon: FiShield }] },
];

const STUDENT_NAV = [
  { section: "Participate", items: [
    { path: "/student/dashboard", label: "Dashboard", Icon: FiHome },
    { path: "/student/candidates", label: "Candidates", Icon: FiUsers },
    { path: "/student/vote", label: "Cast Vote", Icon: FiCheckSquare },
    { path: "/student/results", label: "Results", Icon: FiBarChart2 },
  ]},
  { section: "My Account", items: [{ path: "/student/candidacy", label: "My Candidacy", Icon: FiUser }] },
];

function Avatar({ user, size = 34 }: { user: any; size?: number }) {
  const isAdmin = user?.role === "election_head";
  const abbr = initials(user?.full_name ?? user?.email ?? "??");
  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 border-[1.5px] ${isAdmin ? "border-gold" : "border-cyan"}`}
      style={{ width: size, height: size }}
    >
      <ProtectedImage
        url={`/api/auth/me/photo?u=${user?.id ?? 0}`}
        alt={abbr}
        initials={abbr}
        className="w-full h-full"
      />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const title = PAGE_TITLES[pathname] ?? "";

  function handleLogout() {
    logout();
    toast.success("Signed out successfully");
    router.push("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside
        className={`desktop-sidebar bg-void border-r border-border flex flex-col relative overflow-hidden shrink-0 z-20 transition-all duration-300 h-screen sticky top-0 ${collapsed ? "w-16 min-w-16" : "w-60 min-w-60"}`}
      >
        <StarField />

        {/* Brand */}
        <div className={`border-b border-border relative z-[1] ${collapsed ? "py-5 text-center" : "px-5 py-5"}`}>
          {!collapsed ? (
            <>
              <div className="font-[var(--font-display)] text-[22px] font-black text-white">Secure <span className="text-gold">Online Voting System</span></div>
            </>
          ) : (
            <div className="font-[var(--font-display)] text-sm font-black text-gold">iV</div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2.5 overflow-y-auto overflow-x-hidden relative z-[1]">
          {nav.map(({ section, items }) => (
            <div key={section}>
              {!collapsed && (
                <div className="text-[9px] uppercase tracking-[0.25em] text-text-3 px-5 pt-3.5 pb-1.5 font-[var(--font-display)] font-semibold">{section}</div>
              )}
              {items.map(({ path, label, Icon }) => {
                const active = pathname === path;
                return (
                  <Link
                    key={path}
                    href={path}
                    title={collapsed ? label : undefined}
                    className={`flex items-center gap-2.5 w-full text-sm transition-all border-l-[3px]
                      ${collapsed ? "py-2.5 justify-center" : "py-2 px-5"}
                      ${active ? "bg-cyan/8 border-l-cyan text-cyan font-semibold" : "border-l-transparent text-white/50 hover:text-white/85 hover:bg-white/4"}`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="flex-1 text-left">{label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-border relative z-[1]">
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 px-5 py-3.5">
              <Avatar user={user} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-1 truncate">{user.full_name ?? user.email}</div>
                <div className="text-[10px] text-text-3 mt-0.5">{isAdmin ? "Election Head" : `${user.faculty ?? ""} · Year ${user.year ?? ""}`}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`flex items-center w-full py-2.5 px-4 bg-transparent border-none text-text-3 cursor-pointer hover:text-white transition-colors ${collapsed ? "justify-center" : "justify-end"}`}
          >
            {collapsed ? <FiChevronsRight size={16} /> : <FiChevronsLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-deep shrink-0">
          <span className="font-[var(--font-display)] text-sm font-bold text-white tracking-wider uppercase">{title}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="text-text-3 hover:text-white bg-transparent border-none cursor-pointer transition-colors p-1"
            >
              {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>
            <NotificationPanel />
            {user && <Avatar user={user} size={34} />}
            <span className="text-sm text-text-2 font-medium hidden sm:inline">{user?.full_name?.split(" ")[0] ?? user?.email}</span>
            <button onClick={handleLogout} title="Sign out" className="text-text-3 hover:text-white bg-transparent border-none cursor-pointer transition-colors">
              <FiLogOut size={15} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto app-shell-content">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Bottom tab bar — mobile */}
      <nav className="bottom-tab-bar fixed bottom-0 left-0 right-0 bg-deep/95 backdrop-blur-xl border-t border-border z-50 flex justify-around py-2 px-1">
        {(isAdmin ? [
          { path: "/admin/dashboard", label: "Home",       Icon: FiGrid },
          { path: "/admin/students",  label: "Students",   Icon: FiUsers },
          { path: "/admin/elections", label: "Elections",  Icon: FiCalendar },
          { path: "/admin/candidates",label: "Candidates", Icon: FiUserCheck },
          { path: "/admin/results",   label: "Results",    Icon: FiBarChart2 },
          { path: "/admin/audit",     label: "Audit",      Icon: FiShield },
        ] : [
          { path: "/student/dashboard", label: "Home", Icon: FiHome },
          { path: "/student/candidates", label: "Candidates", Icon: FiUsers },
          { path: "/student/vote", label: "Vote", Icon: FiCheckSquare },
          { path: "/student/results", label: "Results", Icon: FiBarChart2 },
          { path: "/student/candidacy", label: "Account", Icon: FiUser },
        ]).map(({ path, label, Icon }) => (
          <Link
            key={path}
            href={path}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${pathname === path ? "text-cyan" : "text-text-3"}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
