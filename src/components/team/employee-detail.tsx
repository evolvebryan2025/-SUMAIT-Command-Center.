"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, formatDate, getWorkloadColor } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";
import type { Profile, Task, ContactTask } from "@/lib/types";

interface EmployeeDetailProps {
  employeeId: string;
}

interface TaskWithClient extends Task {
  client_name: string | null;
}

interface ContactTaskWithClient extends ContactTask {
  client_name: string | null;
}

export function EmployeeDetail({ employeeId }: EmployeeDetailProps) {
  const { toast } = useToast();
  const { isAdmin, profile: currentUserProfile } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<TaskWithClient[]>([]);
  const [contactTasks, setContactTasks] = useState<ContactTaskWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", employeeId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: taskData } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", employeeId)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true });

      const { data: contactTaskData } = await supabase
        .from("contact_tasks")
        .select("*")
        .eq("assigned_to", employeeId)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true });

      const clientIds = [
        ...new Set([
          ...(taskData ?? []).map((t) => t.client_id).filter(Boolean),
          ...(contactTaskData ?? []).map((t) => t.client_id).filter(Boolean),
        ]),
      ];

      let clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        clientMap = (clients ?? []).reduce<Record<string, string>>(
          (acc, c) => ({ ...acc, [c.id]: c.name }),
          {}
        );
      }

      setTasks(
        (taskData ?? []).map((t) => ({
          ...t,
          client_name: t.client_id ? (clientMap[t.client_id] ?? null) : null,
        }))
      );

      setContactTasks(
        (contactTaskData ?? []).map((t) => ({
          ...t,
          client_name: t.client_id ? (clientMap[t.client_id] ?? null) : null,
        }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load employee";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [employeeId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDeactivate() {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;

    setDeactivating(true);
    try {
      const res = await fetch(`/api/team/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      const text = await res.text();
      let data: Record<string, string> = {};
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      if (!res.ok) throw new Error(data.error ?? `Server returned ${res.status}`);
      toast("Employee deactivated", "success");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to deactivate";
      toast(message, "error");
      console.error("Deactivate error:", err);
    } finally {
      setDeactivating(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${profile?.name}? This will remove their account, unassign all their tasks, and cannot be undone.`
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/team/${employeeId}`, { method: "DELETE" });
      const text = await res.text();
      let data: Record<string, string> = {};
      try { data = JSON.parse(text); } catch { data = { error: text }; }

      if (!res.ok) {
        throw new Error(data.error ?? `Server returned ${res.status}`);
      }

      toast(data.message ?? "Employee deleted", "success");
      router.push("/team");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast(message, "error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRoleChange(newRole: string) {
    if (!profile || newRole === profile.role) return;

    setChangingRole(true);
    try {
      const res = await fetch(`/api/team/${employeeId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const text = await res.text();
      let data: Record<string, string> = {};
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      if (!res.ok) throw new Error(data.error ?? `Server returned ${res.status}`);
      toast(`Role updated to ${newRole}`, "success");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to change role";
      toast(message, "error");
    } finally {
      setChangingRole(false);
    }
  }

  const isViewingSelf = currentUserProfile?.id === employeeId;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <p className="text-[var(--color-text-secondary)]">Employee not found.</p>
      </Card>
    );
  }

  const totalActiveTasks = tasks.length + contactTasks.length;

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-xl shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle>{profile.name}</CardTitle>
              <p className="text-sm text-[var(--color-text-secondary)]">{profile.email}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {!isViewingSelf && (
                <select
                  title="Change user role"
                  aria-label="Change user role"
                  className="px-3 py-1.5 text-sm rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none cursor-pointer"
                  value={profile.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={changingRole}
                >
                  <option value="admin">Admin</option>
                  <option value="lead">Lead</option>
                  <option value="member">Member</option>
                </select>
              )}
              {profile.is_active && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDeactivate}
                  disabled={deactivating || deleting}
                >
                  {deactivating ? "Deactivating..." : "Deactivate"}
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                disabled={deleting || deactivating}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-[var(--color-text-secondary)]">Role</span>
            <p className="mt-1">
              <Badge variant={STATUS_VARIANTS[profile.role] ?? "neutral"}>
                {capitalize(profile.role)}
              </Badge>
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Joined</span>
            <p className="text-[var(--color-text)]">{formatDate(profile.created_at)}</p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Status</span>
            <p className="mt-1">
              <Badge variant={profile.is_active ? "active" : "neutral"}>
                {profile.is_active ? "Active" : "Inactive"}
              </Badge>
            </p>
          </div>
        </div>
      </Card>

      {/* Workload Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Workload Summary</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full inline-block"
            style={{ backgroundColor: getWorkloadColor(totalActiveTasks) }}
          />
          <span className="text-[var(--color-text)] text-lg font-semibold">
            {totalActiveTasks} active {totalActiveTasks === 1 ? "task" : "tasks"}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">
            ({tasks.length} project + {contactTasks.length} contact)
          </span>
        </div>
      </Card>

      {/* Active Project Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Project Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        {tasks.length === 0 ? (
          <EmptyState
            title="No active project tasks"
            description="This employee has no pending project tasks."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-secondary)]">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Priority</th>
                  <th className="pb-2 pr-4">Client</th>
                  <th className="pb-2">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 pr-4 text-[var(--color-text)]">{task.title}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_VARIANTS[task.status]}>{capitalize(task.status)}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_VARIANTS[task.priority]}>{capitalize(task.priority)}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {task.client_name ?? "-"}
                    </td>
                    <td className="py-3 text-[var(--color-text-secondary)]">
                      {task.due_date ? formatDate(task.due_date) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Active Contact Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Tasks ({contactTasks.length})</CardTitle>
        </CardHeader>
        {contactTasks.length === 0 ? (
          <EmptyState
            title="No active contact tasks"
            description="This employee has no pending contact tasks."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-secondary)]">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Priority</th>
                  <th className="pb-2 pr-4">Client</th>
                  <th className="pb-2">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {contactTasks.map((task) => (
                  <tr key={task.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 pr-4 text-[var(--color-text)]">{task.title}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_VARIANTS[task.status]}>{capitalize(task.status)}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_VARIANTS[task.priority]}>{capitalize(task.priority)}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {task.client_name ?? "-"}
                    </td>
                    <td className="py-3 text-[var(--color-text-secondary)]">
                      {task.due_date ? formatDate(task.due_date) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
