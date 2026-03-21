"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, cn, formatDate } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import type { Task, Profile, Client, TaskStatus } from "@/lib/types";

const COLUMNS: TaskStatus[] = ["pending", "in_progress", "completed", "blocked"];

interface TaskBoardProps {
  tasks: Task[];
  profiles: Record<string, Profile>;
  clients: Record<string, Client>;
  onEdit: (task: Task) => void;
  onRefresh: () => void;
}

export function TaskBoard({ tasks, profiles, clients, onEdit, onRefresh }: TaskBoardProps) {
  const { toast } = useToast();
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const columnTasks = COLUMNS.reduce<Record<TaskStatus, Task[]>>(
    (acc, col) => {
      acc[col] = tasks.filter((t) => t.status === col);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, column: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(column);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, column: TaskStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      const taskId = e.dataTransfer.getData("text/plain");
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === column) return;

      const supabase = createClient();
      const payload: Record<string, unknown> = { status: column };
      if (column === "completed") {
        payload.completed_at = new Date().toISOString();
      } else if (task.status === "completed") {
        payload.completed_at = null;
      }

      const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
      if (error) {
        toast(error.message, "error");
      } else {
        toast(`Moved to ${capitalize(column)}`, "success");
        onRefresh();
      }
    },
    [tasks, toast, onRefresh]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((column) => (
        <div
          key={column}
          className={cn(
            "rounded-[var(--radius)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] p-3 min-h-[300px] transition-colors",
            dragOverColumn === column && "border-[var(--color-primary)] bg-[rgba(239,68,68,0.05)]"
          )}
          onDragOver={(e) => handleDragOver(e, column)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column)}
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANTS[column] ?? "neutral"}>
                {capitalize(column)}
              </Badge>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] font-medium">
              {columnTasks[column].length}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {columnTasks[column].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={task.assigned_to ? profiles[task.assigned_to] : null}
                client={task.client_id ? clients[task.client_id] : null}
                onDragStart={handleDragStart}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  assignee: Profile | null;
  client: Client | null;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onEdit: (task: Task) => void;
}

function TaskCard({ task, assignee, client, onDragStart, onEdit }: TaskCardProps) {
  const isOverdue =
    task.due_date && task.status !== "completed" && new Date(task.due_date) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onEdit(task)}
      className="rounded-[var(--radius)] bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] backdrop-blur-md p-3 cursor-grab active:cursor-grabbing hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-[var(--color-text)] line-clamp-2">{task.title}</h4>
        <Badge variant={STATUS_VARIANTS[task.priority] ?? "neutral"} className="shrink-0 text-[10px]">
          {capitalize(task.priority)}
        </Badge>
      </div>

      <div className="space-y-1.5">
        {assignee && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[10px] text-white font-medium shrink-0">
              {assignee.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] truncate">{assignee.name}</span>
          </div>
        )}

        {client && (
          <div className="text-xs text-[var(--color-text-secondary)] truncate">
            {client.name}
          </div>
        )}

        {task.due_date && (
          <div
            className={cn(
              "text-xs",
              isOverdue ? "text-red-400 font-medium" : "text-[var(--color-text-secondary)]"
            )}
          >
            Due {formatDate(task.due_date)}
          </div>
        )}
      </div>
    </div>
  );
}
