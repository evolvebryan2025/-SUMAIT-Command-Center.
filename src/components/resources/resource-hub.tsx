"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ExternalLink, Globe, FileText, Presentation, Wrench,
  BarChart3, MessageSquare, Link2, File, Search, Filter,
  ChevronDown, ChevronUp, Loader2,
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

interface GroupedResources {
  clientName: string;
  clientId: string | null;
  resources: ClientResource[];
}

export function ResourceHub() {
  const { toast } = useToast();
  const { isAdmin } = useUser();
  const [resources, setResources] = useState<ClientResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const fetchResources = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("client_resources")
        .select("*, clients(name)")
        .order("deploy_date", { ascending: false });
      if (error) throw error;
      setResources(data ?? []);
      // Expand all client groups by default
      const clientNames = new Set(
        (data ?? []).map((r: ClientResource) => r.clients?.name ?? "Internal / SUMAIT")
      );
      setExpandedClients(clientNames);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load resources";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/resources/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      toast(data.message, "success");
      fetchResources();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to seed";
      toast(msg, "error");
    } finally {
      setSeeding(false);
    }
  }

  function toggleClient(name: string) {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  // Filter resources
  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== "all" && r.resource_type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description?.toLowerCase().includes(q);
        const matchesClient = r.clients?.name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesClient) return false;
      }
      return true;
    });
  }, [resources, typeFilter, searchQuery]);

  // Group by client
  const grouped = useMemo((): GroupedResources[] => {
    const map = new Map<string, GroupedResources>();
    for (const r of filtered) {
      const clientName = r.clients?.name ?? "Internal / SUMAIT";
      const clientId = r.client_id;
      if (!map.has(clientName)) {
        map.set(clientName, { clientName, clientId, resources: [] });
      }
      map.get(clientName)!.resources.push(r);
    }
    // Sort groups: Internal last, then alphabetical
    return Array.from(map.values()).sort((a, b) => {
      if (a.clientName.startsWith("Internal")) return 1;
      if (b.clientName.startsWith("Internal")) return -1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [filtered]);

  // Get unique types for filter
  const availableTypes = useMemo(() => {
    const types = new Set(resources.map((r) => r.resource_type));
    return Array.from(types).sort();
  }, [resources]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No resources yet"
          description="Seed the resource hub with your Vercel deployments and client deliverables."
        />
        {isAdmin && (
          <div className="flex justify-center pb-6">
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding ? "Seeding..." : "Seed from Vercel Deployments"}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">All Types</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {TYPE_CONFIG[t]?.label ?? t}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <Button onClick={handleSeed} disabled={seeding} size="sm">
            {seeding ? <><Loader2 size={14} className="animate-spin mr-1" /> Seeding...</> : "Seed Deployments"}
          </Button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {filtered.length} resource{filtered.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[var(--color-text-secondary)]">·</span>
        <span className="text-[var(--color-text-secondary)]">
          {grouped.length} client{grouped.length !== 1 ? "s" : ""}
        </span>
        {searchQuery && (
          <>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </>
        )}
      </div>

      {/* Grouped Resource Cards */}
      {grouped.length === 0 ? (
        <Card>
          <EmptyState title="No matching resources" description="Try adjusting your search or filter." />
        </Card>
      ) : (
        grouped.map((group) => (
          <Card key={group.clientName}>
            <button
              onClick={() => toggleClient(group.clientName)}
              className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {group.clientName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <h3 className="text-[var(--color-text)] font-semibold">{group.clientName}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {group.resources.length} resource{group.resources.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {expandedClients.has(group.clientName) ? (
                <ChevronUp size={18} className="text-[var(--color-text-secondary)]" />
              ) : (
                <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
              )}
            </button>

            {expandedClients.has(group.clientName) && (
              <div className="border-t border-[var(--color-border)]">
                {group.resources.map((r) => {
                  const config = TYPE_CONFIG[r.resource_type] ?? TYPE_CONFIG.link;
                  const Icon = config.icon;
                  return (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 px-6 py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)]">
                        <Icon size={16} className="text-[var(--color-text-secondary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text)] truncate">
                              {r.title}
                            </p>
                            {r.description && (
                              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                                {r.description}
                              </p>
                            )}
                          </div>
                          {r.url && (
                            <a
                              href={r.url}
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
                          <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </Badge>
                          {r.deploy_date && (
                            <span className="text-[10px] text-[var(--color-text-secondary)]">
                              {new Date(r.deploy_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
