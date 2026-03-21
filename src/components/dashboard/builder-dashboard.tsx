"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_VARIANTS, COMMENT_TYPE_LABELS } from "@/lib/constants";
import { capitalize, formatRelativeTime } from "@/lib/utils";
import type { Task, Notification } from "@/lib/types";
import {
  CheckCircle,
  ClipboardList,
  AlertTriangle,
  HelpCircle,
  Bell,
  ArrowRight,
} from "lucide-react";

function getDeadlineBadge(dueDate: string | null, status: string): { label: string; variant: "danger" | "warning" } | null {
  if (!dueDate || status === "completed") return null;
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (dueDate < today) return { label: "Overdue", variant: "danger" };
  if (dueDate === today || dueDate === tomorrow) return { label: "Due soon", variant: "warning" };
  return null;
}

export function BuilderDashboard() {
  const { profile } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reportSubmitted, setReportSubmitted] = useState<boolean | null>(null);
  const [openIssues, setOpenIssues] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const supabase = createClient();

    // Fetch assigned tasks
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", profile.id)
      .neq("status", "completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20);

    setTasks(taskData ?? []);

    // Check today's report
    const today = new Date().toISOString().split("T")[0];
    const { data: report } = await supabase
      .from("daily_reports")
      .select("id")
      .eq("user_id", profile.id)
      .eq("report_date", today)
      .maybeSingle();

    setReportSubmitted(!!report);

    // Fetch open questions/blockers
    const { data: issues } = await supabase
      .from("task_comments")
      .select("id, content, comment_type, task_id, created_at, tasks:task_id(title)")
      .eq("author_id", profile.id)
      .eq("is_resolved", false)
      .in("comment_type", ["question", "blocker"])
      .order("created_at", { ascending: false })
      .limit(10);

    setOpenIssues(issues ?? []);

    // Fetch recent notifications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    setNotifications(notifs ?? []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-1">
          Welcome, {profile?.name?.split(" ")[0] ?? "Builder"}
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Here&apos;s your overview for today.
        </p>
      </div>

      {/* Quick Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
            <CheckCircle size={20} className="text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{tasks.length}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Active Tasks</p>
          </div>
        </Card>

        <Card className={`flex items-center gap-3 ${reportSubmitted ? "border-green-500/20" : "border-yellow-500/30"}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reportSubmitted ? "bg-[rgba(34,197,94,0.1)]" : "bg-[rgba(234,179,8,0.1)]"}`}>
            <ClipboardList size={20} className={reportSubmitted ? "text-[#22c55e]" : "text-[#eab308]"} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {reportSubmitted ? "Report Submitted" : "Report Pending"}
            </p>
            {!reportSubmitted && (
              <Link href="/daily-report" className="text-xs text-[var(--color-primary)] hover:underline">
                Submit now →
              </Link>
            )}
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(139,92,246,0.1)] flex items-center justify-center">
            <Bell size={20} className="text-[#8b5cf6]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{unreadCount}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Unread Notifications</p>
          </div>
        </Card>
      </div>

      {/* My Tasks */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">My Tasks</h2>
          <Link href="/tasks">
            <Button size="sm" variant="secondary">
              View All <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
        {tasks.length === 0 ? (
          <EmptyState title="No active tasks" description="You're all caught up!" />
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 8).map((task) => {
              const deadline = getDeadlineBadge(task.due_date, task.status);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={STATUS_VARIANTS[task.status] ?? "neutral"} className="text-[10px]">
                        {capitalize(task.status.replace(/_/g, " "))}
                      </Badge>
                      <Badge variant={STATUS_VARIANTS[task.priority] ?? "neutral"} className="text-[10px]">
                        {capitalize(task.priority)}
                      </Badge>
                      {deadline && (
                        <Badge variant={deadline.variant} className="text-[10px]">
                          {deadline.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {task.due_date && (
                    <span className="text-xs text-[var(--color-text-secondary)] ml-3 whitespace-nowrap">
                      {task.due_date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Open Questions / Blockers */}
      {openIssues.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Open Questions & Blockers
          </h2>
          <div className="space-y-3">
            {openIssues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)]">
                {issue.comment_type === "blocker" ? (
                  <AlertTriangle size={16} className="text-[#ef4444] mt-0.5 shrink-0" />
                ) : (
                  <HelpCircle size={16} className="text-[#8b5cf6] mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-[var(--color-text)]">{issue.content}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    on &ldquo;{issue.tasks?.title ?? "Unknown task"}&rdquo; · {formatRelativeTime(issue.created_at)}
                  </p>
                </div>
                <Badge
                  variant={issue.comment_type === "blocker" ? "danger" : "info"}
                  className="text-[10px] shrink-0"
                >
                  {COMMENT_TYPE_LABELS[issue.comment_type] ?? issue.comment_type}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Recent Notifications
          </h2>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg ${n.is_read ? "opacity-60" : "bg-[rgba(255,255,255,0.02)]"}`}
              >
                <p className="text-sm font-medium text-[var(--color-text)]">{n.title}</p>
                {n.message && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {formatRelativeTime(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
