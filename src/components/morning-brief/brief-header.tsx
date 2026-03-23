"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BriefHeaderProps {
  date: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function BriefHeader({ date, onDateChange, onRefresh, loading }: BriefHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Morning Brief
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Daily overview of operations, tasks, and alerts
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm"
        />
        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
