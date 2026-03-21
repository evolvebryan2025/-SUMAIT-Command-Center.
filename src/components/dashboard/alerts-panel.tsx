"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { useUser } from "@/hooks/use-user";
import type { Alert, AlertSeverity } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_VARIANT: Record<AlertSeverity, "danger" | "warning" | "info" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { isAdmin } = useUser();

  const fetchAlerts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("is_resolved", false)
      .order("severity", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      const sorted = [...data].sort((a, b) => {
        const severityDiff =
          SEVERITY_ORDER[a.severity as AlertSeverity] -
          SEVERITY_ORDER[b.severity as AlertSeverity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAlerts(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useRealtime("alerts", fetchAlerts);

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("alerts")
      .update({
        is_resolved: true,
        resolved_by: user?.id ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    setResolvingId(null);
    await fetchAlerts();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-5 w-16" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
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
        <CardTitle>Alerts</CardTitle>
      </CardHeader>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-secondary)]">
          <AlertTriangle className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No unresolved alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)]"
            >
              <Badge variant={SEVERITY_VARIANT[alert.severity]}>
                {alert.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                  {alert.title}
                </p>
                {alert.message && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                    {alert.message}
                  </p>
                )}
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={resolvingId === alert.id}
                  onClick={() => handleResolve(alert.id)}
                >
                  {resolvingId === alert.id ? "..." : "Resolve"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
