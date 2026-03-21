"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES, TASK_PRIORITIES, STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, formatDate, cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { ContactTask, Profile, TaskStatus, TaskPriority } from "@/lib/types";

interface ContactTaskListProps {
  contactId: string;
  clientId: string;
}

interface TaskWithAssignee extends ContactTask {
  assignee_name: string | null;
}

interface NewTaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  assigned_to: string;
  due_date: string;
}

const EMPTY_TASK: NewTaskForm = {
  title: "",
  description: "",
  priority: "medium",
  assigned_to: "",
  due_date: "",
};

export function ContactTaskList({ contactId, clientId }: ContactTaskListProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<NewTaskForm>({ ...EMPTY_TASK });

  const fetchTasks = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contact_tasks")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const assigneeIds = [...new Set((data ?? []).map((t) => t.assigned_to).filter(Boolean))];
      let profileMap: Record<string, string> = {};

      if (assigneeIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", assigneeIds);
        profileMap = (profileData ?? []).reduce<Record<string, string>>(
          (acc, p) => ({ ...acc, [p.id]: p.name }),
          {}
        );
      }

      const tasksWithNames: TaskWithAssignee[] = (data ?? []).map((t) => ({
        ...t,
        assignee_name: t.assigned_to ? (profileMap[t.assigned_to] ?? null) : null,
      }));

      setTasks(tasksWithNames);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load tasks";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  const fetchProfiles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setProfiles(data ?? []);
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
  }, [fetchTasks, fetchProfiles]);

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      const supabase = createClient();
      const update: Record<string, unknown> = { status };
      if (status === "completed") {
        update.completed_at = new Date().toISOString();
      } else {
        update.completed_at = null;
      }
      const { error } = await supabase
        .from("contact_tasks")
        .update(update)
        .eq("id", taskId);
      if (error) throw error;
      toast("Status updated", "success");
      fetchTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast(message, "error");
    }
  }

  async function handleDelete(taskId: string) {
    setDeletingId(taskId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("contact_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
      toast("Task deleted", "success");
      fetchTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      toast(message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast("Title is required", "error");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("contact_tasks").insert({
        contact_id: contactId,
        client_id: clientId,
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to || null,
        due_date: newTask.due_date || null,
        status: "pending" as TaskStatus,
      });
      if (error) throw error;
      toast("Task added", "success");
      setNewTask({ ...EMPTY_TASK });
      setShowForm(false);
      fetchTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add task";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = TASK_STATUSES.map((s) => ({ value: s, label: capitalize(s) }));
  const priorityOptions = TASK_PRIORITIES.map((p) => ({ value: p, label: capitalize(p) }));
  const profileOptions = [
    { value: "", label: "Unassigned" },
    ...profiles.map((p) => ({ value: p.id, label: p.name })),
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks ({tasks.length})</CardTitle>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Task"}
        </Button>
      </CardHeader>

      {showForm && (
        <form onSubmit={handleAddTask} className="space-y-3 mb-6 p-4 rounded-[var(--radius)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)]">
          <Input
            label="Title"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Task description..."
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectField
              label="Priority"
              options={priorityOptions}
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
            />
            <SelectField
              label="Assigned To"
              options={profileOptions}
              value={newTask.assigned_to}
              onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
            />
            <Input
              label="Due Date"
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            />
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Adding..." : "Add Task"}
          </Button>
        </form>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Add a task to start tracking work for this contact."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-secondary)]">
                <th className="pb-2 pr-4">Title</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Priority</th>
                <th className="pb-2 pr-4">Assigned To</th>
                <th className="pb-2 pr-4">Due Date</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3 pr-4 text-[var(--color-text)]">{task.title}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text)] cursor-pointer"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={STATUS_VARIANTS[task.priority]}>{capitalize(task.priority)}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                    {task.assignee_name ?? "Unassigned"}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                    {task.due_date ? formatDate(task.due_date) : "-"}
                  </td>
                  <td className="py-3">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(task.id)}
                      disabled={deletingId === task.id}
                    >
                      {deletingId === task.id ? "..." : "Delete"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
