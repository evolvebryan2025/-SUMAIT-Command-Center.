"use client";

import { useCallback, useEffect, useState } from "react";
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
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/providers/toast-provider";

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
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();

  const fetchHealthData = useCallback(async () => {
    const supabase = createClient();

    const { data: clients } = await supabase
      .from("clients")
      .select("name, health_score")
      .order("health_score", { ascending: false })
      .limit(10);

    setData(clients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch("/api/clients/health-score", { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        toast(body.error ?? "Failed to recalculate", "error");
        return;
      }

      toast(`Health scores updated for ${body.updated} clients`, "success");
      await fetchHealthData();
    } catch {
      toast("Network error recalculating scores", "error");
    } finally {
      setRecalculating(false);
    }
  }

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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Client Health</CardTitle>
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            size={13}
            className={recalculating ? "animate-spin" : ""}
          />
          {recalculating ? "Recalculating..." : "Recalculate Health"}
        </button>
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
