"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { capitalize, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import type { ActivityLog } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ActivityTabProps {
  clientId: string;
}

const PAGE_SIZE = 20;

const ACTION_ICONS: Record<string, string> = {
  created: "+",
  updated: "~",
  deleted: "x",
  completed: "v",
  assigned: ">",
};

function getActionIcon(action: string): string {
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (action.toLowerCase().includes(key)) return icon;
  }
  return "*";
}

function buildActivityText(entry: ActivityLog): string {
  const action = entry.action;
  const entityType = capitalize(entry.entity_type);
  const name =
    typeof entry.metadata?.name === "string"
      ? entry.metadata.name
      : typeof entry.metadata?.title === "string"
        ? entry.metadata.title
        : "";

  const parts = [action, entityType];
  if (name) parts.push(`"${name}"`);
  return parts.join(" ");
}

export function ActivityTab({ clientId }: ActivityTabProps) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchActivities = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const supabase = createClient();

      // Fetch direct client activity
      const directQuery = supabase
        .from("activity_log")
        .select("*")
        .eq("entity_type", "client")
        .eq("entity_id", clientId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      // Fetch activity where metadata references this client
      const metadataQuery = supabase
        .from("activity_log")
        .select("*")
        .neq("entity_type", "client")
        .contains("metadata", { client_id: clientId })
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      // Fetch activity for tasks belonging to this client
      const taskActivityQuery = supabase
        .from("activity_log")
        .select("*")
        .eq("entity_type", "task")
        .contains("metadata", { client_id: clientId })
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      // Fetch activity for projects belonging to this client
      const projectActivityQuery = supabase
        .from("activity_log")
        .select("*")
        .eq("entity_type", "project")
        .contains("metadata", { client_id: clientId })
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const [directResult, metadataResult, taskResult, projectResult] =
        await Promise.all([
          directQuery,
          metadataQuery,
          taskActivityQuery,
          projectActivityQuery,
        ]);

      const error =
        directResult.error ??
        metadataResult.error ??
        taskResult.error ??
        projectResult.error;

      if (error) {
        toast(error.message, "error");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // Merge and deduplicate by id
      const allEntries = [
        ...(directResult.data ?? []),
        ...(metadataResult.data ?? []),
        ...(taskResult.data ?? []),
        ...(projectResult.data ?? []),
      ];

      const uniqueMap = new Map<string, ActivityLog>();
      for (const entry of allEntries) {
        uniqueMap.set(entry.id, entry);
      }

      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Take only PAGE_SIZE entries
      const page = sorted.slice(0, PAGE_SIZE);

      if (append) {
        setActivities((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newEntries = page.filter((a) => !existingIds.has(a.id));
          return [...prev, ...newEntries];
        });
      } else {
        setActivities(page);
      }

      setHasMore(page.length >= PAGE_SIZE);
      setLoading(false);
      setLoadingMore(false);
    },
    [clientId, toast]
  );

  useEffect(() => {
    fetchActivities(0, false);
  }, [fetchActivities]);

  const handleLoadMore = useCallback(() => {
    fetchActivities(activities.length, true);
  }, [fetchActivities, activities.length]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activity recorded for this client"
        description="Activity will appear here as actions are taken on this client, their projects, and tasks."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--color-text)]">
        Activity ({activities.length}{hasMore ? "+" : ""})
      </h3>

      {/* Timeline */}
      <div className="relative space-y-1">
        {/* Vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-[rgba(255,255,255,0.1)]" />

        {activities.map((entry) => (
          <div key={entry.id} className="relative flex items-start gap-4 py-2 pl-1">
            {/* Icon dot */}
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-bold text-[var(--color-text-secondary)]">
              {getActionIcon(entry.action)}
            </div>

            {/* Content */}
            <Card className="flex-1 !py-3 !px-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-[var(--color-text)]">
                  {buildActivityText(entry)}
                </p>
                <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap shrink-0">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>
              {entry.user_id && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  by {typeof entry.metadata?.user_name === "string" ? entry.metadata.user_name : entry.user_id.slice(0, 8)}
                </p>
              )}
            </Card>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button size="sm" variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
