"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Mail, MousePointerClick, Reply, AlertTriangle, Users, Pause, Play, Trash2 } from "lucide-react";
import { useToast } from "@/providers/toast-provider";

export interface Campaign {
  id: string;
  name: string;
  status: string;
  leads_count?: number;
  sent_count?: number;
  open_count?: number;
  reply_count?: number;
  bounce_count?: number;
  open_rate?: number;
  reply_rate?: number;
  bounce_rate?: number;
  created_at?: string;
}

const STATUS_VARIANT_MAP: Record<string, "active" | "warning" | "danger" | "info" | "neutral"> = {
  active: "active",
  paused: "warning",
  draft: "neutral",
  completed: "info",
  disabled: "neutral",
  error: "danger",
};

function getStatusVariant(status: unknown): "active" | "warning" | "danger" | "info" | "neutral" {
  if (typeof status !== "string") return "neutral";
  return STATUS_VARIANT_MAP[status.toLowerCase()] ?? "neutral";
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
}

interface CampaignCardsProps {
  statusFilter: string;
  onSelectCampaign: (campaign: Campaign) => void;
  refreshKey: number;
  accountId?: string | null;
}

export function CampaignCards({ statusFilter, onSelectCampaign, refreshKey, accountId }: CampaignCardsProps) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (accountId) {
        params.set("accountId", accountId);
      }
      const res = await fetch(`/api/campaigns?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to fetch campaigns" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const items: Campaign[] = Array.isArray(data) ? data : data.items ?? data.data ?? [];
      setCampaigns(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch campaigns";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, accountId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns, refreshKey]);

  const handleToggleStatus = useCallback(
    async (campaign: Campaign, e: React.MouseEvent) => {
      e.stopPropagation();
      const newStatus = campaign.status === "active" ? "paused" : "active";
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, accountId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Failed to update" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        toast(`Campaign ${newStatus === "active" ? "activated" : "paused"}.`, "success");
        fetchCampaigns();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update campaign";
        toast(message, "error");
      }
    },
    [fetchCampaigns, toast]
  );

  const handleDelete = useCallback(
    async (campaign: Campaign, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm(`Delete campaign "${campaign.name}"?`)) return;
      try {
        const params = accountId ? `?accountId=${accountId}` : "";
        const res = await fetch(`/api/campaigns/${campaign.id}${params}`, { method: "DELETE" });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Failed to delete" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        toast("Campaign deleted.", "success");
        fetchCampaigns();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete campaign";
        toast(message, "error");
      }
    },
    [fetchCampaigns, toast]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle size={40} />}
        title="Failed to load campaigns"
        description={error}
        action={<Button onClick={fetchCampaigns}>Retry</Button>}
      />
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<Mail size={40} />}
        title="No campaigns found"
        description={
          statusFilter !== "all"
            ? "No campaigns match the selected filter. Try a different status."
            : "Get started by creating your first email campaign."
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {campaigns.map((campaign) => (
        <button
          key={campaign.id}
          type="button"
          onClick={() => onSelectCampaign(campaign)}
          className="text-left w-full cursor-pointer"
        >
          <Card className="hover:bg-[rgba(255,255,255,0.07)] transition-colors h-full">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                  {campaign.name}
                </p>
              </div>
              <Badge variant={getStatusVariant(campaign.status)}>
                {String(campaign.status ?? "unknown")}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mb-3">
              <Users size={12} />
              <span>{formatNumber(campaign.leads_count)} leads</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MetricBox icon={<Mail size={12} />} label="Sent" value={formatNumber(campaign.sent_count)} />
              <MetricBox icon={<MousePointerClick size={12} />} label="Opened" value={formatPercent(campaign.open_rate)} />
              <MetricBox icon={<Reply size={12} />} label="Replied" value={formatPercent(campaign.reply_rate)} />
              <MetricBox icon={<AlertTriangle size={12} />} label="Bounced" value={formatPercent(campaign.bounce_rate)} />
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
              {(campaign.status === "active" || campaign.status === "paused") && (
                <button
                  type="button"
                  onClick={(e) => handleToggleStatus(campaign, e)}
                  className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.1)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                  title={campaign.status === "active" ? "Pause campaign" : "Activate campaign"}
                >
                  {campaign.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => handleDelete(campaign, e)}
                className="p-1.5 rounded-md hover:bg-[rgba(239,68,68,0.1)] text-[var(--color-text-secondary)] hover:text-red-400 transition-colors cursor-pointer"
                title="Delete campaign"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-[rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)] mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
