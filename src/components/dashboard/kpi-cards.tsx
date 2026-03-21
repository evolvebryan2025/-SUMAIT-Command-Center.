"use client";

import { useEffect, useState } from "react";
import { Users, CheckSquare, UserCog, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiData {
  label: string;
  value: number;
  icon: React.ElementType;
}

export function KpiCards() {
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKpis() {
      const supabase = createClient();

      const [clientsRes, tasksRes, teamRes, alertsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "in_progress"]),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("is_resolved", false),
      ]);

      setKpis([
        { label: "Active Clients", value: clientsRes.count ?? 0, icon: Users },
        { label: "Active Tasks", value: tasksRes.count ?? 0, icon: CheckSquare },
        { label: "Team Members", value: teamRes.count ?? 0, icon: UserCog },
        { label: "Unresolved Alerts", value: alertsRes.count ?? 0, icon: Bell },
      ]);
      setLoading(false);
    }

    fetchKpis();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">
                {kpi.label}
              </span>
            </div>
            <p className="text-3xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
              {kpi.value}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
