"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Heart,
  FileText,
  Settings,
  Info,
  Check,
  Clock,
  MessageCircle,
  HelpCircle,
  AlertOctagon,
  ClipboardX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/types";

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  task_assigned: <CheckCircle size={16} className="text-[#3b82f6]" />,
  task_overdue: <AlertTriangle size={16} className="text-[#ef4444]" />,
  task_due_soon: <Clock size={16} className="text-[#f59e0b]" />,
  client_health: <Heart size={16} className="text-[#eab308]" />,
  report_ready: <FileText size={16} className="text-[#22c55e]" />,
  comment_reply: <MessageCircle size={16} className="text-[#3b82f6]" />,
  question_posted: <HelpCircle size={16} className="text-[#8b5cf6]" />,
  blocker_raised: <AlertOctagon size={16} className="text-[#ef4444]" />,
  daily_report_missing: <ClipboardX size={16} className="text-[#f59e0b]" />,
  system: <Settings size={16} className="text-[var(--color-text-muted)]" />,
  info: <Info size={16} className="text-[#3b82f6]" />,
};

export function NotificationBell() {
  const { profile } = useUser();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const processedIdsRef = useRef<Set<string>>(new Set());

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;

    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    }
    setLoading(false);
  }, [profile]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!profile) return;

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          setNotifications((prev) => [newNotification, ...prev]);

          if (!processedIdsRef.current.has(newNotification.id)) {
            processedIdsRef.current.add(newNotification.id);
            toast(newNotification.title, "info");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, toast]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }, []);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell size={20} className="text-[var(--color-text-muted)]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#ef4444] rounded-full leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[380px] max-h-[440px] flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
                <Bell size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-border)]/30 border-b border-[var(--color-border)]/50 last:border-b-0",
                    !notification.is_read && "bg-[var(--color-primary)]/5"
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    {NOTIFICATION_ICONS[notification.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-tight truncate",
                        notification.is_read
                          ? "text-[var(--color-text-muted)]"
                          : "text-[var(--color-text)] font-medium"
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--color-text-muted)]/60 mt-1">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notification.is_read && (
                    <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-[#3b82f6]" />
                  )}
                </button>
              ))
            )}
          </div>

          <Popover.Arrow className="fill-[var(--color-surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
