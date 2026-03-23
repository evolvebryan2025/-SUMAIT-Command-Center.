"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { usePortalBranding } from "@/hooks/use-portal-branding";
import { PortalComments } from "@/components/portal/portal-comments";
import {
  PORTAL_TASK_STATUS_LABELS,
  PORTAL_TASK_STATUS_COLORS,
} from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  client_name: string | null;
  project_name: string | null;
  created_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PortalTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { branding } = usePortalBranding();

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/portal/tasks");
      if (res.ok) {
        const data = await res.json();
        const found = (data.tasks ?? []).find(
          (t: TaskDetail) => t.id === id
        );
        setTask(found ?? null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm opacity-50" style={{ color: branding.text_color }}>
          Task not found or you do not have access.
        </p>
        <Link
          href="/portal"
          className="inline-flex items-center gap-1 mt-4 text-sm"
          style={{ color: branding.accent_color }}
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>
    );
  }

  const statusColor = PORTAL_TASK_STATUS_COLORS[task.status] ?? "#6b7280";
  const statusLabel = PORTAL_TASK_STATUS_LABELS[task.status] ?? task.status;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: branding.text_color }}
      >
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Blocked warning */}
      {task.status === "blocked" && (
        <div
          className="flex items-center gap-3 rounded-lg border px-4 py-3"
          style={{
            backgroundColor: "rgba(239,68,68,0.08)",
            borderColor: "rgba(239,68,68,0.25)",
          }}
        >
          <AlertTriangle size={18} style={{ color: "#ef4444" }} />
          <p className="text-sm font-medium" style={{ color: "#ef4444" }}>
            This task is currently blocked. If you have questions, leave a
            comment below.
          </p>
        </div>
      )}

      {/* Task card */}
      <div
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <h1
            className="text-xl font-bold"
            style={{ color: branding.text_color, fontFamily: branding.font_heading }}
          >
            {task.title}
          </h1>
          <span
            className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: `${statusColor}15`,
              borderColor: `${statusColor}30`,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>

        {task.project_name && (
          <p className="text-sm opacity-50" style={{ color: branding.text_color }}>
            Project: {task.project_name}
          </p>
        )}

        {task.description && (
          <p
            className="text-sm whitespace-pre-wrap"
            style={{ color: branding.text_color, opacity: 0.75 }}
          >
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-xs" style={{ color: branding.text_color, opacity: 0.5 }}>
          {task.due_date && (
            <span>Due: {formatDate(task.due_date)}</span>
          )}
          {task.completed_at && (
            <span>Completed: {formatDate(task.completed_at)}</span>
          )}
        </div>
      </div>

      {/* Comments */}
      <PortalComments taskId={task.id} />
    </div>
  );
}
