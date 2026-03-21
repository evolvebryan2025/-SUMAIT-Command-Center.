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
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientHealth {
  name: string;
  health_score: number;
}

function getHealthColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ClientHealth; value: number }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <p style={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}>
        {item.name}
      </p>
      <p style={{ color: getHealthColor(item.health_score), fontSize: 13 }}>
        Health Score: {item.health_score}
      </p>
    </div>
  );
}

export function ClientHealthChart() {
  const [data, setData] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();

      const { data: clients } = await supabase
        .from("clients")
        .select("name, health_score")
        .order("health_score", { ascending: false })
        .limit(10);

      setData(clients ?? []);
      setLoading(false);
    }

    fetch();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Health</CardTitle>
        </CardHeader>
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Health</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.1)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="health_score" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={getHealthColor(entry.health_score)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
