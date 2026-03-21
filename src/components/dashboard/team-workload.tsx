"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWorkloadColor } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMember {
  profile: Profile;
  taskCount: number;
}

export function TeamWorkload() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkload() {
      const supabase = createClient();

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (!profiles || profiles.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const profileIds = profiles.map((p) => p.id);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("assigned_to")
        .in("assigned_to", profileIds)
        .in("status", ["pending", "in_progress"]);

      const taskCounts = new Map<string, number>();
      for (const t of tasks ?? []) {
        if (t.assigned_to) {
          taskCounts.set(t.assigned_to, (taskCounts.get(t.assigned_to) ?? 0) + 1);
        }
      }

      const result: TeamMember[] = profiles.map((p) => ({
        profile: p,
        taskCount: taskCounts.get(p.id) ?? 0,
      }));

      setMembers(result);
      setLoading(false);
    }

    fetchWorkload();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Workload</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 w-10" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Workload</CardTitle>
      </CardHeader>
      {members.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] py-4">
          No active team members
        </p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {members.map((member) => {
            const initial = member.profile.name.charAt(0).toUpperCase();
            const borderColor = getWorkloadColor(member.taskCount);
            return (
              <div key={member.profile.id} className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold text-[var(--color-text)] bg-[rgba(255,255,255,0.1)] border-2"
                  style={{ borderColor }}
                >
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {member.profile.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {member.taskCount} task{member.taskCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
