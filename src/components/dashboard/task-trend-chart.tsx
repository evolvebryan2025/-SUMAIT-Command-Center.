"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
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

interface TrendDataPoint {
  date: string;
  created: number;
  completed: number;
}

interface TaskRow {
  created_at: string;
  status: string;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildTrendData(tasks: TaskRow[]): TrendDataPoint[] {
  const now = new Date();
  const days: TrendDataPoint[] = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, created: 0, completed: 0 });
  }

  const dateMap = new Map(days.map((d) => [d.date, d]));

  for (const task of tasks) {
    const key = task.created_at.slice(0, 10);
    const entry = dateMap.get(key);
    if (entry) {
      entry.created += 1;
      if (task.status === "completed") {
        entry.completed += 1;
      }
    }
  }

  return days.map((d) => ({ ...d, date: formatDate(d.date) }));
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

export function TaskTrendChart() {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const twoWeeksAgo = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: tasks } = await supabase
        .from("tasks")
        .select("created_at, status")
        .gte("created_at", twoWeeksAgo);

      setData(buildTrendData(tasks ?? []));
      setLoading(false);
    }

    fetch();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Trend (14 Days)</CardTitle>
        </CardHeader>
        <Skeleton className="h-[250px] w-full" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Trend (14 Days)</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="date"
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
          <Area
            type="monotone"
            dataKey="created"
            name="Created"
            stroke="#6366f1"
            fill="url(#gradCreated)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="#22c55e"
            fill="url(#gradCompleted)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
