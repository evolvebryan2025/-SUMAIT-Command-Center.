"use client";

import { useState } from "react";
import type { BriefAlert, AlertCategory } from "@/lib/types";

interface AlertsSectionProps {
  alerts: BriefAlert[];
  onResolve: () => void;
}

const categoryStyles: Record<AlertCategory, { bg: string; text: string; label: string }> = {
  OVERDUE: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "OVERDUE" },
  DEADLINE: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", label: "DEADLINE" },
  BLOCKER: { bg: "rgba(249,115,22,0.12)", text: "#f97316", label: "BLOCKER" },
  MEETING: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", label: "MEETING" },
  STALE: { bg: "rgba(107,114,128,0.12)", text: "#6b7280", label: "STALE" },
};

export function AlertsSection({ alerts, onResolve }: AlertsSectionProps) {
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const handleResolve = async (alert: BriefAlert) => {
    if (!alert.source_id || !alert.source_type) return;

    setResolving((prev) => new Set(prev).add(alert.id));

    try {
      const res = await fetch("/api/morning-brief/resolve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: alert.source_type,
          source_id: alert.source_id,
        }),
      });
      if (res.ok) onResolve();
    } catch {
      // Revert on failure
    } finally {
      setResolving((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
          Alerts ({alerts.length})
        </h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {alerts.map((alert) => {
          const style = categoryStyles[alert.category];
          const isResolving = resolving.has(alert.id);

          return (
            <div
              key={alert.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)]"
            >
              <input
                type="checkbox"
                checked={isResolving}
                onChange={() => handleResolve(alert)}
                disabled={isResolving || !alert.source_id}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
              />
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {style.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)] truncate">{alert.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{alert.message}</p>
              </div>
              {alert.client_name && (
                <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
                  {alert.client_name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
