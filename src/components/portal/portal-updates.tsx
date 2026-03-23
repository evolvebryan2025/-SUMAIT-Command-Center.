"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Info,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePortalBranding } from "@/hooks/use-portal-branding";
import { Skeleton } from "@/components/ui/skeleton";

interface PortalNotification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task_assigned: <CheckCircle2 size={16} />,
  task_overdue: <AlertTriangle size={16} />,
  task_due_soon: <Clock size={16} />,
  client_comment: <MessageSquare size={16} />,
  info: <Info size={16} />,
  system: <Bell size={16} />,
};

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PortalUpdates() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { branding } = usePortalBranding();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell
          size={40}
          className="mb-4 opacity-30"
          style={{ color: branding.text_color }}
        />
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: branding.text_color }}
        >
          No updates yet
        </h3>
        <p
          className="text-sm opacity-50"
          style={{ color: branding.text_color }}
        >
          Notifications about your tasks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const icon = TYPE_ICONS[n.type] ?? <Bell size={16} />;

        return (
          <div
            key={n.id}
            className="flex items-start gap-3 rounded-lg border p-4 transition-colors"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: n.is_read
                ? "transparent"
                : "rgba(255,255,255,0.02)",
            }}
          >
            {/* Unread dot */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className="opacity-50"
                style={{ color: branding.text_color }}
              >
                {icon}
              </div>
              {!n.is_read && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: branding.accent_color }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium"
                style={{
                  color: branding.text_color,
                  opacity: n.is_read ? 0.6 : 1,
                }}
              >
                {n.title}
              </p>
              {n.message && (
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{
                    color: branding.text_color,
                    opacity: n.is_read ? 0.35 : 0.55,
                  }}
                >
                  {n.message}
                </p>
              )}
            </div>

            {/* Timestamp */}
            <span
              className="shrink-0 text-[10px] opacity-40"
              style={{ color: branding.text_color }}
            >
              {formatTimestamp(n.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
