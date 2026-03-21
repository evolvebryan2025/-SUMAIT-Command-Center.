"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { formatRelativeTime, capitalize } from "@/lib/utils";
import type { ActivityLog } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    setEntries(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useRealtime("activity_log", fetchActivity);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
      </CardHeader>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-secondary)]">
          <Activity className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 text-sm"
            >
              <div className="mt-1.5 h-2 w-2 rounded-full bg-[var(--color-primary)] shrink-0" />
              <p className="flex-1 text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text)] font-medium">
                  {capitalize(entry.action)}
                </span>{" "}
                {capitalize(entry.entity_type)}
              </p>
              <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
                {formatRelativeTime(entry.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
