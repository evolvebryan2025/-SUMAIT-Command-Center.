"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, LayoutDashboard, Users, UserCog, FileText,
  Settings, CheckSquare, Mail, CalendarDays, ClipboardList,
  Bell, User,
} from "lucide-react";
import { DevKitSwitcher } from "./dev-kit-switcher";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Daily Report", href: "/daily-report", icon: ClipboardList },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Campaigns", href: "/campaigns", icon: Mail },
  { label: "Team", href: "/team", icon: UserCog },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

const memberBottomTabs = [
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Report", href: "/daily-report", icon: ClipboardList },
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Alerts", href: "/settings/notifications", icon: Bell },
  { label: "Profile", href: "/settings/profile", icon: User },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useUser();

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="lg:hidden">
      {/* Hamburger menu button (admin and fallback) */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] cursor-pointer",
          !isAdmin && "max-[900px]:hidden"
        )}
      >
        <Menu size={20} />
      </button>

      {/* Slide-out drawer (admin) */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 h-screen w-72 bg-[var(--color-surface)] border-r border-[var(--color-border)] z-50 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <DevKitSwitcher />
              <button onClick={() => setOpen(false)} className="p-1 text-[var(--color-text-secondary)] cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {filteredItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                      isActive
                        ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-primary)] font-medium"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}

      {/* Bottom tab bar for members on mobile */}
      {!isAdmin && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-around py-2 px-1 min-[901px]:hidden safe-area-bottom">
          {memberBottomTabs.map((tab) => {
            const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] min-h-[44px] justify-center rounded-lg transition-colors",
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)]"
                )}
              >
                <tab.icon size={20} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
