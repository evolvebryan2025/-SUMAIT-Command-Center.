"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { REPORT_TYPE_LABELS } from "@/lib/constants";
import { Trash2 } from "lucide-react";
import type { GeneratedReport } from "@/lib/types";

interface ReportHistoryProps {
  onSelect: (report: GeneratedReport) => void;
  onDeleted?: () => void;
  refreshKey?: number;
}

export function ReportHistory({ onSelect, onDeleted, refreshKey }: ReportHistoryProps) {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("generated_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setReports(data || []);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === reports.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reports.map((r) => r.id)));
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    const supabase = createClient();
    const ids = Array.from(selected);
    await supabase.from("generated_reports").delete().in("id", ids);
    setReports((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    setSelectionMode(false);
    setDeleting(false);
    onDeleted?.();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Report History</CardTitle></CardHeader>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Report History</CardTitle>
          {reports.length > 0 && (
            <button
              onClick={() => {
                setSelectionMode((v) => !v);
                if (selectionMode) setSelected(new Set());
              }}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              {selectionMode ? "Cancel" : "Manage"}
            </button>
          )}
        </div>
      </CardHeader>
      {reports.length === 0 ? (
        <EmptyState title="No reports yet" description="Generate your first report above." />
      ) : (
        <>
          {selectionMode && (
            <div className="flex items-center justify-between px-1 mb-2">
              <button
                onClick={toggleSelectAll}
                className="text-xs text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                {selected.size === reports.length ? "Deselect All" : "Select All"}
              </button>
              {selected.size > 0 && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {deleting ? "Deleting..." : `Delete ${selected.size}`}
                </button>
              )}
            </div>
          )}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center gap-2">
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selected.has(report.id)}
                    onChange={() => toggleSelect(report.id)}
                    title={`Select ${report.title}`}
                    className="accent-[var(--color-primary)] w-4 h-4 shrink-0 cursor-pointer"
                  />
                )}
                <button
                  onClick={() => onSelect(report)}
                  className="flex-1 text-left p-3 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[var(--color-border)] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--color-text)]">{report.title}</span>
                    <Badge variant="info">{REPORT_TYPE_LABELS[report.type] || report.type}</Badge>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(report.created_at)}</p>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
