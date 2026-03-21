"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMemberPerformance {
  name: string;
  pending: number;
  in_progress: number;
  completed: number;
  blocked: number;
}

interface TaskRow {
  status: string;
  assigned_to: string;
  profiles: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#6366f1",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  blocked: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

function aggregateByMember(tasks: TaskRow[]): TeamMemberPerformance[] {
  const map = new Map<string, TeamMemberPerformance>();

  for (const task of tasks) {
    const memberName = task.profiles?.name ?? "Unassigned";
    const existing = map.get(memberName) ?? {
      name: memberName,
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
    };

    const status = task.status as keyof Omit<TeamMemberPerformance, "name">;
    if (status in existing) {
      existing[status] += 1;
    }

    map.set(memberName, existing);
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.pending + b.in_progress + b.completed + b.blocked -
      (a.pending + a.in_progress + a.completed + a.blocked)
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <p style={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, fontSize: 13 }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function TeamPerformanceChart() {
  const [data, setData] = useState<TeamMemberPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();

      const { data: tasks } = await supabase
        .from("tasks")
        .select("status, assigned_to, profiles!tasks_assigned_to_fkey(name)");

      setData(aggregateByMember((tasks as unknown as TaskRow[]) ?? []));
      setLoading(false);
    }

    fetch();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.1)"
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: "var(--color-text-secondary)", fontSize: 13 }}
          />
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <Bar
              key={status}
              dataKey={status}
              name={STATUS_LABELS[status]}
              stackId="tasks"
              fill={color}
              radius={
                status === "blocked" ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
