"use client";

import type { Task, TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskPillProps {
  task: Task;
}

const priorityStyles: Record<TaskPriority, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export function TaskPill({ task }: TaskPillProps) {
  return (
    <div
      className={cn(
        "text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate max-w-full",
        priorityStyles[task.priority]
      )}
      title={task.title}
    >
      {task.title}
    </div>
  );
}
