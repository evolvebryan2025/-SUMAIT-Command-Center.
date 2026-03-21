"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import type { Task, DailyReport, DailyReportItem } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportItemRow, type ReportItemData } from "./report-item-row";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";

type SectionType = "completed" | "pending" | "blocker";

interface SectionState {
  completed: boolean;
  pending: boolean;
  blocker: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const SECTION_META: Record<SectionType, { label: string; icon: React.ReactNode; badgeVariant: "active" | "warning" | "danger" }> = {
  completed: { label: "Completed", icon: <CheckCircle size={16} />, badgeVariant: "active" },
  pending: { label: "Pending", icon: <Clock size={16} />, badgeVariant: "warning" },
  blocker: { label: "Blockers", icon: <AlertTriangle size={16} />, badgeVariant: "danger" },
};

export function ReportForm() {
  const { profile } = useUser();
  const { toast } = useToast();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toISODate(today), [today]);

  // Form state
  const [items, setItems] = useState<Record<SectionType, ReportItemData[]>>({
    completed: [],
    pending: [],
    blocker: [],
  });
  const [collapsed, setCollapsed] = useState<SectionState>({
    completed: false,
    pending: false,
    blocker: false,
  });
  const [existingReportId, setExistingReportId] = useState<string | null>(null);

  // Loading states
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Assigned tasks
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [checkedTaskIds, setCheckedTaskIds] = useState<Set<string>>(new Set());

  // Past reports
  const [pastReports, setPastReports] = useState<DailyReport[]>([]);

  // Fetch assigned tasks
  useEffect(() => {
    async function fetchTasks() {
      setLoadingTasks(true);
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const data: Task[] = await res.json();
          const relevant = data.filter(
            (t) =>
              t.assigned_to === profile?.id &&
              (t.status === "pending" || t.status === "in_progress")
          );
          setAssignedTasks(relevant);
        }
      } catch {
        // Silently handle -- tasks are optional enhancement
      } finally {
        setLoadingTasks(false);
      }
    }
    if (profile?.id) fetchTasks();
  }, [profile?.id]);

  // Fetch existing report for today
  useEffect(() => {
    async function fetchTodayReport() {
      setLoadingReport(true);
      try {
        const res = await fetch(`/api/daily-reports?date=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          const report: DailyReport | null = data.report ?? null;
          if (report) {
            setExistingReportId(report.id);
            // Rebuild items from report
            const grouped: Record<SectionType, ReportItemData[]> = {
              completed: [],
              pending: [],
              blocker: [],
            };
            for (const item of report.items ?? []) {
              grouped[item.item_type].push({
                description: item.description,
                links: item.links ?? [],
                item_type: item.item_type,
                task_id: item.task_id,
              });
              if (item.task_id) {
                setCheckedTaskIds((prev) => new Set([...prev, item.task_id!]));
              }
            }
            setItems(grouped);
          }
        }
      } catch {
        // Non-critical
      } finally {
        setLoadingReport(false);
      }
    }
    if (profile?.id) fetchTodayReport();
  }, [profile?.id, todayStr]);

  // Fetch past 7 reports
  useEffect(() => {
    async function fetchPastReports() {
      try {
        const res = await fetch("/api/daily-reports?past=7");
        if (res.ok) {
          const data = await res.json();
          setPastReports(data.reports ?? []);
        }
      } catch {
        // Non-critical
      }
    }
    if (profile?.id) fetchPastReports();
  }, [profile?.id]);

  // Toggle task checkbox
  const handleTaskToggle = useCallback(
    (task: Task) => {
      setCheckedTaskIds((prev) => {
        const next = new Set(prev);
        if (next.has(task.id)) {
          next.delete(task.id);
          // Remove the auto-created item
          setItems((prevItems) => ({
            ...prevItems,
            completed: prevItems.completed.filter((i) => i.task_id !== task.id),
          }));
        } else {
          next.add(task.id);
          // Auto-create a completed item
          const newItem: ReportItemData = {
            description: task.title,
            links: [],
            item_type: "completed",
            task_id: task.id,
          };
          setItems((prevItems) => ({
            ...prevItems,
            completed: [...prevItems.completed, newItem],
          }));
        }
        return next;
      });
    },
    []
  );

  // Section item management
  const handleAddItem = useCallback((section: SectionType) => {
    const newItem: ReportItemData = {
      description: "",
      links: [],
      item_type: section,
    };
    setItems((prev) => ({
      ...prev,
      [section]: [...prev[section], newItem],
    }));
  }, []);

  const handleUpdateItem = useCallback(
    (section: SectionType, index: number, updated: ReportItemData) => {
      setItems((prev) => ({
        ...prev,
        [section]: prev[section].map((item, i) => (i === index ? updated : item)),
      }));
    },
    []
  );

  const handleRemoveItem = useCallback(
    (section: SectionType, index: number) => {
      setItems((prev) => {
        const removed = prev[section][index];
        // If it was linked to a task, uncheck it
        if (removed.task_id) {
          setCheckedTaskIds((prevIds) => {
            const next = new Set(prevIds);
            next.delete(removed.task_id!);
            return next;
          });
        }
        return {
          ...prev,
          [section]: prev[section].filter((_, i) => i !== index),
        };
      });
    },
    []
  );

  const toggleSection = useCallback((section: SectionType) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Submit
  const handleSubmit = useCallback(async () => {
    const allItems = [
      ...items.completed.map((item, i) => ({ ...item, sort_order: i })),
      ...items.pending.map((item, i) => ({ ...item, sort_order: i })),
      ...items.blocker.map((item, i) => ({ ...item, sort_order: i })),
    ];

    // Validate at least one item has a description
    const hasContent = allItems.some((item) => item.description.trim().length > 0);
    if (!hasContent) {
      toast("Please add at least one item with a description.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        report_date: todayStr,
        items: allItems.map((item) => ({
          item_type: item.item_type,
          description: item.description.trim(),
          links: item.links.filter((l) => l.trim().length > 0),
          task_id: item.task_id ?? null,
          sort_order: item.sort_order,
        })),
        ...(existingReportId ? { id: existingReportId } : {}),
      };

      const res = await fetch("/api/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Failed to submit report.", "error");
        return;
      }

      const data = await res.json();
      setExistingReportId(data.id ?? existingReportId);
      toast(existingReportId ? "Report updated." : "Report submitted.", "success");

      // Refresh past reports
      const pastRes = await fetch("/api/daily-reports?past=7");
      if (pastRes.ok) {
        const pastData = await pastRes.json();
        setPastReports(pastData.reports ?? []);
      }
    } catch {
      toast("Failed to submit report. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [items, todayStr, existingReportId, toast]);

  const totalItems =
    items.completed.length + items.pending.length + items.blocker.length;

  if (loadingReport) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date display */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--color-text-secondary)] text-sm">
          {formatDate(today)}
        </p>
        {existingReportId && (
          <Badge variant="info">Editing existing report</Badge>
        )}
      </div>

      {/* Task linkage section */}
      {!loadingTasks && assignedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Tasks</CardTitle>
          </CardHeader>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            Check tasks you completed today to auto-add them to your report.
          </p>
          <div className="space-y-2">
            {assignedTasks.map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-[var(--radius)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checkedTaskIds.has(task.id)}
                  onChange={() => handleTaskToggle(task)}
                  className="w-4 h-4 rounded accent-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-text)] flex-1">
                  {task.title}
                </span>
                <Badge
                  variant={task.status === "in_progress" ? "info" : "neutral"}
                >
                  {task.status === "in_progress" ? "In Progress" : "Pending"}
                </Badge>
              </label>
            ))}
          </div>
        </Card>
      )}

      {loadingTasks && (
        <Skeleton className="h-24 w-full" />
      )}

      {/* Report sections */}
      {(["completed", "pending", "blocker"] as const).map((section) => {
        const meta = SECTION_META[section];
        const sectionItems = items[section];
        const isCollapsed = collapsed[section];

        return (
          <Card key={section}>
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(section)}
              className="flex items-center gap-2 w-full text-left cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight size={18} className="text-[var(--color-text-secondary)]" />
              ) : (
                <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
              )}
              <span className="text-[var(--color-text-secondary)]">{meta.icon}</span>
              <span className="font-[var(--font-heading)] font-semibold text-[var(--color-text)]">
                {meta.label}
              </span>
              {sectionItems.length > 0 && (
                <Badge variant={meta.badgeVariant}>{sectionItems.length}</Badge>
              )}
            </button>

            {/* Section content */}
            {!isCollapsed && (
              <div className="mt-4 space-y-3">
                {sectionItems.map((item, index) => (
                  <ReportItemRow
                    key={`${section}-${index}`}
                    item={item}
                    onChange={(updated) => handleUpdateItem(section, index, updated)}
                    onRemove={() => handleRemoveItem(section, index)}
                  />
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddItem(section)}
                >
                  <Plus size={14} />
                  Add Item
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      {/* Submit */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--color-text-secondary)]">
          {totalItems} item{totalItems !== 1 ? "s" : ""} in report
        </p>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {existingReportId ? "Update Report" : "Submit Report"}
        </Button>
      </div>

      {/* Past reports */}
      {pastReports.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-[var(--color-border)]">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--color-text)]">
            Recent Reports
          </h2>
          {pastReports.map((report) => (
            <PastReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Past Report Summary Card ────────────────────────────────── */

function PastReportCard({ report }: { report: DailyReport }) {
  const completedItems = (report.items ?? []).filter((i) => i.item_type === "completed");
  const pendingItems = (report.items ?? []).filter((i) => i.item_type === "pending");
  const blockerItems = (report.items ?? []).filter((i) => i.item_type === "blocker");

  const reportDate = new Date(report.report_date + "T00:00:00");

  return (
    <Card className="opacity-80">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[var(--color-text)]">
          {reportDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
        <div className="flex items-center gap-2">
          {completedItems.length > 0 && (
            <Badge variant="active">{completedItems.length} done</Badge>
          )}
          {pendingItems.length > 0 && (
            <Badge variant="warning">{pendingItems.length} pending</Badge>
          )}
          {blockerItems.length > 0 && (
            <Badge variant="danger">{blockerItems.length} blocked</Badge>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {(report.items ?? []).map((item) => (
          <p key={item.id} className="text-xs text-[var(--color-text-secondary)] truncate">
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{
              backgroundColor:
                item.item_type === "completed"
                  ? "#22c55e"
                  : item.item_type === "pending"
                  ? "#eab308"
                  : "#ef4444",
            }} />
            {item.description}
          </p>
        ))}
      </div>
    </Card>
  );
}
