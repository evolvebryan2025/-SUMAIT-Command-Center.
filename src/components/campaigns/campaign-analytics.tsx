"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, MousePointerClick, Reply, ShieldAlert } from "lucide-react";
import type { Campaign } from "./campaign-cards";

interface DailyData {
  date: string;
  sent: number;
  opened: number;
  replied: number;
}

interface SequenceData {
  name: string;
  sent: number;
  opened: number;
  replied: number;
}

interface AnalyticsData {
  total_sent?: number;
  total_opened?: number;
  total_replied?: number;
  total_bounced?: number;
  open_rate?: number;
  reply_rate?: number;
  bounce_rate?: number;
  daily?: DailyData[];
  sequences?: SequenceData[];
}

interface CampaignAnalyticsProps {
  campaign: Campaign;
  onClose: () => void;
  accountId?: string | null;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

const CHART_COLORS = {
  sent: "#6366f1",
  opened: "#22c55e",
  replied: "#3b82f6",
  bounced: "#ef4444",
};

export function CampaignAnalytics({ campaign, onClose, accountId }: CampaignAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = accountId ? `?accountId=${accountId}` : "";
      const res = await fetch(`/api/campaigns/${campaign.id}/analytics${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to fetch analytics" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch analytics";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Analytics</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaign Analytics</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <div className="flex flex-col items-center py-8 text-center">
          <AlertTriangle size={32} className="text-[var(--color-text-secondary)] mb-2" />
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">{error}</p>
          <Button size="sm" onClick={fetchAnalytics}>Retry</Button>
        </div>
      </Card>
    );
  }

  const totalSent = analytics?.total_sent ?? campaign.sent_count ?? 0;
  const openRate = analytics?.open_rate ?? campaign.open_rate ?? 0;
  const replyRate = analytics?.reply_rate ?? campaign.reply_rate ?? 0;
  const bounceRate = analytics?.bounce_rate ?? campaign.bounce_rate ?? 0;

  const dailyData: DailyData[] = analytics?.daily ?? [];
  const sequenceData: SequenceData[] = analytics?.sequences ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{campaign.name}</CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Campaign analytics and performance
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Mail size={16} />} label="Total Sent" value={totalSent.toLocaleString()} />
        <StatCard icon={<MousePointerClick size={16} />} label="Open Rate" value={formatPercent(openRate)} color="#22c55e" />
        <StatCard icon={<Reply size={16} />} label="Reply Rate" value={formatPercent(replyRate)} color="#3b82f6" />
        <StatCard icon={<ShieldAlert size={16} />} label="Bounce Rate" value={formatPercent(bounceRate)} color="#ef4444" />
      </div>

      {/* Daily sends/opens/replies line chart */}
      {dailyData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">Daily Performance</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17,17,17,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#f1f1f1",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="sent" stroke={CHART_COLORS.sent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="opened" stroke={CHART_COLORS.opened} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="replied" stroke={CHART_COLORS.replied} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top performing sequences bar chart */}
      {sequenceData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">Sequence Performance</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sequenceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17,17,17,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#f1f1f1",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="sent" fill={CHART_COLORS.sent} radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill={CHART_COLORS.opened} radius={[4, 4, 0, 0]} />
                <Bar dataKey="replied" fill={CHART_COLORS.replied} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Fallback when no chart data */}
      {dailyData.length === 0 && sequenceData.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)] py-6 text-center">
          No detailed analytics data available for this campaign yet.
        </p>
      )}
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)] mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color: color ?? "var(--color-text)" }}>
        {value}
      </p>
    </div>
  );
}
