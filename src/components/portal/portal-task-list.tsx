"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { usePortalBranding } from "@/hooks/use-portal-branding";
import {
  PORTAL_TASK_STATUS_LABELS,
  PORTAL_TASK_STATUS_COLORS,
} from "@/lib/constants";

export interface PortalTask {
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

interface PortalTaskListProps {
  tasks: PortalTask[];
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={16} />,
  in_progress: <Loader2 size={16} />,
  pending: <Clock size={16} />,
  blocked: <AlertTriangle size={16} />,
};

const STATUS_SORT_ORDER: Record<string, number> = {
  blocked: 0,
  in_progress: 1,
  pending: 2,
  completed: 3,
};

type FilterKey = "all" | "blocked" | "in_progress" | "pending" | "completed";

const FILTER_OPTIONS: FilterKey[] = [
  "all",
  "blocked",
  "in_progress",
  "pending",
  "completed",
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PortalTaskList({ tasks }: PortalTaskListProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const { branding } = usePortalBranding();

  const counts: Record<string, number> = { all: tasks.length };
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const sorted = [...filtered].sort(
    (a, b) =>
      (STATUS_SORT_ORDER[a.status] ?? 99) -
      (STATUS_SORT_ORDER[b.status] ?? 99)
  );

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((key) => {
          const isActive = filter === key;
          const label =
            key === "all"
              ? "All"
              : PORTAL_TASK_STATUS_LABELS[key] ?? key;
          const count = counts[key] ?? 0;
          const color =
            key === "all"
              ? branding.accent_color
              : PORTAL_TASK_STATUS_COLORS[key] ?? "#6b7280";

          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer"
              style={{
                backgroundColor: isActive
                  ? `${color}20`
                  : "rgba(255,255,255,0.05)",
                borderColor: isActive ? `${color}50` : "rgba(255,255,255,0.1)",
                color: isActive ? color : "rgba(255,255,255,0.5)",
              }}
            >
              {label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={{
                  backgroundColor: isActive
                    ? `${color}30`
                    : "rgba(255,255,255,0.08)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock size={40} className="mb-4 opacity-30" style={{ color: branding.text_color }} />
          <h3
            className="text-lg font-semibold mb-1"
            style={{ color: branding.text_color }}
          >
            No tasks found
          </h3>
          <p className="text-sm opacity-50" style={{ color: branding.text_color }}>
            {filter === "all"
              ? "There are no tasks to display yet."
              : `No ${PORTAL_TASK_STATUS_LABELS[filter] ?? filter} tasks right now.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => {
            const statusColor =
              PORTAL_TASK_STATUS_COLORS[task.status] ?? "#6b7280";
            const statusLabel =
              PORTAL_TASK_STATUS_LABELS[task.status] ?? task.status;
            const dateLabel =
              task.status === "completed"
                ? formatDate(task.completed_at)
                : formatDate(task.due_date);
            const datePrefix =
              task.status === "completed" ? "Completed" : "Due";

            return (
              <Link
                key={task.id}
                href={`/portal/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                {/* Status icon */}
                <div style={{ color: statusColor }}>{STATUS_ICONS[task.status]}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: branding.text_color }}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.project_name && (
                      <span className="text-xs opacity-50" style={{ color: branding.text_color }}>
                        {task.project_name}
                      </span>
                    )}
                    {dateLabel && (
                      <span className="text-xs opacity-40" style={{ color: branding.text_color }}>
                        {datePrefix} {dateLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
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

                {/* Chevron */}
                <ChevronRight
                  size={16}
                  className="shrink-0 opacity-30"
                  style={{ color: branding.text_color }}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
