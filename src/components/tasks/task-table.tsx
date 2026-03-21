"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES } from "@/lib/constants";
import { STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, cn, formatDate } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/ui/select-field";
import { getDeadlineBadge } from "@/lib/deadline";
import type { Task, Profile, Client } from "@/lib/types";

type SortKey = "title" | "status" | "priority" | "due_date" | "created_at";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface TaskTableProps {
  tasks: Task[];
  profiles: Record<string, Profile>;
  clients: Record<string, Client>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
  isAdmin: boolean;
}

export function TaskTable({
  tasks,
  profiles,
  clients,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onRefresh,
  isAdmin,
}: TaskTableProps) {
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "priority":
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case "due_date":
          cmp = (a.due_date ?? "").localeCompare(b.due_date ?? "");
          break;
        case "created_at":
          cmp = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [tasks, sortKey, sortDir]);

  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(tasks.map((t) => t.id)));
    }
  }, [allSelected, tasks, onSelectionChange]);

  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const handleInlineStatusChange = useCallback(
    async (task: Task, newStatus: string) => {
      const supabase = createClient();
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "completed") {
        payload.completed_at = new Date().toISOString();
      } else if (task.status === "completed") {
        payload.completed_at = null;
      }
      const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
      if (error) {
        toast(error.message, "error");
      } else {
        toast("Status updated", "success");
        onRefresh();
      }
    },
    [toast, onRefresh]
  );

  const statusOptions = useMemo(
    () => TASK_STATUSES.map((s) => ({ value: s, label: capitalize(s) })),
    []
  );

  const SortHeader = ({ label, colKey }: { label: string; colKey: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)]"
      onClick={() => toggleSort(colKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === colKey && (
          <span className="text-[var(--color-primary)]">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(255,255,255,0.05)] backdrop-blur-md">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-[var(--color-primary)] cursor-pointer"
              />
            </th>
            <SortHeader label="Task" colKey="title" />
            <SortHeader label="Status" colKey="status" />
            <SortHeader label="Priority" colKey="priority" />
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Assigned To
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Client
            </th>
            <SortHeader label="Due Date" colKey="due_date" />
            {isAdmin && (
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const assignee = task.assigned_to ? profiles[task.assigned_to] : null;
            const client = task.client_id ? clients[task.client_id] : null;
            const isOverdue =
              task.due_date && task.status !== "completed" && new Date(task.due_date) < new Date();

            return (
              <tr
                key={task.id}
                className={cn(
                  "border-b border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.03)] transition-colors",
                  selectedIds.has(task.id) && "bg-[rgba(239,68,68,0.05)]"
                )}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(task.id)}
                    onChange={() => toggleOne(task.id)}
                    className="accent-[var(--color-primary)] cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--color-text)] text-sm">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-[var(--color-text-secondary)] truncate max-w-xs mt-0.5">
                      {task.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="w-36">
                    <SelectField
                      options={statusOptions}
                      value={task.status}
                      onChange={(e) => handleInlineStatusChange(task, e.target.value)}
                      className="!py-1.5 !px-2 !text-xs"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[task.priority] ?? "neutral"}>
                    {capitalize(task.priority)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  {assignee?.name ?? "\u2014"}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  {client?.name ?? "\u2014"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {task.due_date ? (
                    <div className="flex flex-col gap-1">
                      <span className={isOverdue ? "text-red-400 font-medium" : "text-[var(--color-text-secondary)]"}>
                        {formatDate(task.due_date)}
                      </span>
                      {(() => {
                        const deadlineBadge = getDeadlineBadge(task.due_date, task.status);
                        return deadlineBadge ? (
                          <Badge variant={deadlineBadge.variant} className="text-[10px] w-fit">
                            {deadlineBadge.label}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <span className="text-[var(--color-text-secondary)]">{"\u2014"}</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(task)}
                        className="text-xs text-[var(--color-primary)] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(task)}
                        className="text-xs text-red-400 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {sortedTasks.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-sm text-[var(--color-text-secondary)]">
                No tasks match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
