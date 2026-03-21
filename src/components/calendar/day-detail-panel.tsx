"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { Task } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, formatDate } from "@/lib/utils";

interface DayDetailPanelProps {
  date: string;
  tasks: Task[];
  onClose: () => void;
  profiles: Record<string, { name: string }>;
}

export function DayDetailPanel({ date, tasks, onClose, profiles }: DayDetailPanelProps) {
  const formattedDate = formatDate(date);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold font-[var(--font-heading)] text-[var(--color-text)]">
            {formattedDate}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
              No tasks due on this date.
            </p>
          )}

          {tasks.map((task) => {
            const assigneeName = task.assigned_to
              ? profiles[task.assigned_to]?.name ?? "Unknown"
              : "Unassigned";

            return (
              <Link
                key={task.id}
                href="/tasks"
                className="block p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-[var(--color-text)] line-clamp-2">
                    {task.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={STATUS_VARIANTS[task.priority] ?? "neutral"}>
                    {capitalize(task.priority)}
                  </Badge>
                  <Badge variant={STATUS_VARIANTS[task.status] ?? "neutral"}>
                    {capitalize(task.status)}
                  </Badge>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {assigneeName}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
