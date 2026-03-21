"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import type { Task, Profile, Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskFiltersBar, type TaskFilters } from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { LayoutGrid, Table, Trash2 } from "lucide-react";

type ViewMode = "table" | "kanban";

export default function TasksPage() {
  const { isAdmin } = useUser();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<TaskFilters>({
    status: "all",
    priority: "all",
    assignee: "all",
    client: "all",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [tasksRes, profilesRes, clientsRes] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("*").eq("is_active", true).limit(100),
      supabase.from("clients").select("*").limit(500),
    ]);

    if (tasksRes.error) {
      setError(tasksRes.error.message);
      setLoading(false);
      return;
    }

    setTasks(tasksRes.data ?? []);

    const profileMap: Record<string, Profile> = {};
    for (const p of profilesRes.data ?? []) {
      profileMap[p.id] = p;
    }
    setProfiles(profileMap);

    const clientMap: Record<string, Client> = {};
    for (const c of clientsRes.data ?? []) {
      clientMap[c.id] = c;
    }
    setClients(clientMap);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.assignee !== "all" && t.assigned_to !== filters.assignee) return false;
      if (filters.client !== "all" && t.client_id !== filters.client) return false;
      return true;
    });
  }, [tasks, filters]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  }, []);

  const handleNewTask = useCallback(() => {
    setEditingTask(null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (task: Task) => {
      if (!confirm(`Delete task "${task.title}"?`)) return;
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Failed to delete task", "error");
      } else {
        toast("Task deleted.", "success");
        fetchData();
      }
    },
    [toast, fetchData]
  );

  const handleSaved = useCallback(() => {
    setSelectedIds(new Set());
    fetchData();
  }, [fetchData]);

  // Bulk actions
  const handleBulkStatusUpdate = useCallback(
    async (newStatus: string) => {
      if (selectedIds.size === 0) return;

      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );

      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast(`${failed} task(s) failed to update`, "error");
      } else {
        toast(`Updated ${selectedIds.size} task(s) to ${capitalize(newStatus)}`, "success");
      }
      setSelectedIds(new Set());
      fetchData();
    },
    [selectedIds, toast, fetchData]
  );

  const handleBulkAssign = useCallback(
    async (assigneeId: string) => {
      if (selectedIds.size === 0) return;

      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assigned_to: assigneeId || null }),
          })
        )
      );

      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast(`${failed} task(s) failed to assign`, "error");
      } else {
        const name = assigneeId ? profiles[assigneeId]?.name ?? "Unknown" : "Unassigned";
        toast(`Assigned ${selectedIds.size} task(s) to ${name}`, "success");
      }
      setSelectedIds(new Set());
      fetchData();
    },
    [selectedIds, profiles, toast, fetchData]
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected task(s)?`)) return;

    const results = await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/tasks/${id}`, { method: "DELETE" })
      )
    );

    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) {
      toast(`${failed} task(s) failed to delete`, "error");
    } else {
      toast(`Deleted ${selectedIds.size} task(s)`, "success");
    }
    setSelectedIds(new Set());
    fetchData();
  }, [selectedIds, toast, fetchData]);

  const bulkStatusOptions = useMemo(
    () => [
      { value: "", label: "Set Status..." },
      ...TASK_STATUSES.map((s) => ({ value: s, label: capitalize(s) })),
    ],
    []
  );

  const bulkAssignOptions = useMemo(
    () => [
      { value: "", label: "Assign To..." },
      ...Object.values(profiles).map((p) => ({ value: p.id, label: p.name })),
    ],
    [profiles]
  );

  if (error) {
    return (
      <EmptyState
        title="Failed to load tasks"
        description={error}
        action={<Button onClick={fetchData}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Tasks
        </h1>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 cursor-pointer transition-colors ${
                viewMode === "table"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
              title="Table view"
            >
              <Table size={18} />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 cursor-pointer transition-colors ${
                viewMode === "kanban"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
              title="Kanban view"
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          {isAdmin && (
            <Button onClick={handleNewTask}>New Task</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <TaskFiltersBar filters={filters} onChange={setFilters} />

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && isAdmin && (
        <div className="flex items-center gap-3 p-3 rounded-[var(--radius)] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
          <span className="text-sm text-[var(--color-text)] font-medium">
            {selectedIds.size} selected
          </span>
          <div className="w-40">
            <SelectField
              options={bulkStatusOptions}
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkStatusUpdate(e.target.value);
              }}
            />
          </div>
          <div className="w-40">
            <SelectField
              options={bulkAssignOptions}
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkAssign(e.target.value);
              }}
            />
          </div>
          <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            <Trash2 size={14} />
            Delete
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTasks.length === 0 && (
        <EmptyState
          title="No tasks found"
          description={
            filters.status !== "all" || filters.priority !== "all" || filters.assignee !== "all" || filters.client !== "all"
              ? "Try adjusting your filters."
              : "Get started by creating your first task."
          }
          action={
            filters.status === "all" && filters.priority === "all" && filters.assignee === "all" && filters.client === "all" && isAdmin ? (
              <Button onClick={handleNewTask}>New Task</Button>
            ) : undefined
          }
        />
      )}

      {/* Content */}
      {!loading && filteredTasks.length > 0 && viewMode === "table" && (
        <TaskTable
          tasks={filteredTasks}
          profiles={profiles}
          clients={clients}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={fetchData}
          isAdmin={isAdmin}
        />
      )}

      {!loading && filteredTasks.length > 0 && viewMode === "kanban" && (
        <TaskBoard
          tasks={filteredTasks}
          profiles={profiles}
          clients={clients}
          onEdit={handleEdit}
          onRefresh={fetchData}
        />
      )}

      {/* Task form dialog */}
      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSaved={handleSaved}
      />
    </div>
  );
}
