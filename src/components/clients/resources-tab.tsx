"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ExternalLink, Globe, FileText, Presentation, Wrench,
  BarChart3, MessageSquare, Link2, File,
} from "lucide-react";
import type { ClientResource } from "@/lib/types";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Globe; variant: "active" | "warning" | "danger" | "info" | "neutral" }> = {
  deployment: { label: "Deployment", icon: Globe, variant: "active" },
  deliverable: { label: "Deliverable", icon: FileText, variant: "active" },
  presentation: { label: "Presentation", icon: Presentation, variant: "info" },
  tool: { label: "Tool", icon: Wrench, variant: "warning" },
  report: { label: "Report", icon: BarChart3, variant: "neutral" },
  meeting_note: { label: "Meeting Note", icon: MessageSquare, variant: "info" },
  link: { label: "Link", icon: Link2, variant: "neutral" },
  document: { label: "Document", icon: File, variant: "neutral" },
};

const STATUS_VARIANT: Record<string, "active" | "warning" | "neutral"> = {
  live: "active",
  archived: "neutral",
  migrated: "warning",
};

interface ResourcesTabProps {
  clientId: string;
}

export function ResourcesTab({ clientId }: ResourcesTabProps) {
  const [resources, setResources] = useState<ClientResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("client_resources")
        .select("*")
        .eq("client_id", clientId)
        .order("deploy_date", { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }
      setResources(data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load resources";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <EmptyState
          title="Failed to load resources"
          description={error}
        />
      </Card>
    );
  }

  if (resources.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No resources yet"
          description="Resources like deployments, deliverables, and documents for this client will appear here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
        {resources.length} resource{resources.length !== 1 ? "s" : ""}
      </p>

      {resources.map((resource) => {
        const config = TYPE_CONFIG[resource.resource_type] ?? TYPE_CONFIG.link;
        const Icon = config.icon;

        return (
          <Card key={resource.id}>
            <div className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)]">
                <Icon size={16} className="text-[var(--color-text-secondary)]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                      {resource.title}
                    </p>
                    {resource.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                  </div>
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[var(--color-primary)] transition-colors"
                      title="Open link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  <Badge variant={STATUS_VARIANT[resource.status] ?? "neutral"}>
                    {resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
                  </Badge>
                  {resource.deploy_date && (
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {new Date(resource.deploy_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
