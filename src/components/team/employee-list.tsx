"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, getWorkloadColor } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Profile } from "@/lib/types";

interface EmployeeWithWorkload extends Profile {
  task_count: number;
}

export function EmployeeList() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeWithWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();

        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        const profileIds = (profiles ?? []).map((p) => p.id);

        let taskCounts: Record<string, number> = {};
        if (profileIds.length > 0) {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("assigned_to")
            .in("assigned_to", profileIds)
            .in("status", ["pending", "in_progress"]);

          const { data: contactTasks } = await supabase
            .from("contact_tasks")
            .select("assigned_to")
            .in("assigned_to", profileIds)
            .in("status", ["pending", "in_progress"]);

          const allTasks = [...(tasks ?? []), ...(contactTasks ?? [])];
          taskCounts = allTasks.reduce<Record<string, number>>((acc, t) => {
            if (t.assigned_to) {
              acc[t.assigned_to] = (acc[t.assigned_to] ?? 0) + 1;
            }
            return acc;
          }, {});
        }

        const result: EmployeeWithWorkload[] = (profiles ?? []).map((p) => ({
          ...p,
          task_count: taskCounts[p.id] ?? 0,
        }));

        setEmployees(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load team";
        toast(message, "error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [toast]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <EmptyState
        title="No team members"
        description="Add employees to start managing your team."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {employees.map((emp) => (
        <Link key={emp.id} href={`/team/${emp.id}`}>
          <Card className="hover:border-[var(--color-primary)] transition-colors cursor-pointer">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[var(--color-text)] font-medium truncate">{emp.name}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{emp.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant={STATUS_VARIANTS[emp.role] ?? "neutral"}>{capitalize(emp.role)}</Badge>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: getWorkloadColor(emp.task_count) }}
                />
                <span className="text-[var(--color-text-secondary)]">
                  {emp.task_count} active {emp.task_count === 1 ? "task" : "tasks"}
                </span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
