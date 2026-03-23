"use client";

import type { MorningBriefData } from "@/lib/types";

interface KpiCardsProps {
  kpis: MorningBriefData["kpis"];
}

const cards = [
  { key: "total_clients", label: "Total Clients", color: "var(--color-primary)" },
  { key: "on_track", label: "On Track", color: "#22c55e" },
  { key: "needs_attention", label: "Needs Attention", color: "#f59e0b" },
  { key: "at_risk", label: "At Risk", color: "#ef4444" },
  { key: "no_data", label: "No Data", color: "#6b7280" },
] as const;

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(({ key, label, color }) => (
        <div
          key={key}
          className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
        >
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>
            {kpis[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
