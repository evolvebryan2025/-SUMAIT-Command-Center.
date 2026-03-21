"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BuilderReportCard } from "./builder-report-card";
import { createClient } from "@/lib/supabase/client";
import { FileText, ClipboardList } from "lucide-react";
import type { DailyReport } from "@/lib/types";

interface ActiveMember {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ApiReport {
  id: string;
  user_id: string;
  report_date: string;
  created_at: string;
  updated_at: string;
  status: string;
  daily_report_items?: ApiReportItem[];
}

interface ApiReportItem {
  id: string;
  report_id: string;
  task_id: string | null;
  item_type: "completed" | "pending" | "blocker";
  description: string;
  links: string[];
  sort_order: number;
  created_at: string;
  daily_report_attachments?: ApiAttachment[];
}

interface ApiAttachment {
  id: string;
  item_id: string;
  report_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

function getPhtDate(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function normalizeReport(apiReport: ApiReport): DailyReport {
  const items = (apiReport.daily_report_items ?? []).map((item) => ({
    id: item.id,
    report_id: item.report_id,
    task_id: item.task_id,
    item_type: item.item_type,
    description: item.description,
    links: item.links,
    sort_order: item.sort_order,
    created_at: item.created_at,
    attachments: (item.daily_report_attachments ?? []).map((att) => ({
      id: att.id,
      item_id: att.item_id,
      report_id: att.report_id,
      file_name: att.file_name,
      file_type: att.file_type,
      file_size: att.file_size,
      storage_path: att.storage_path,
      uploaded_by: att.uploaded_by,
      created_at: att.created_at,
    })),
  }));

  return {
    id: apiReport.id,
    user_id: apiReport.user_id,
    report_date: apiReport.report_date,
    created_at: apiReport.created_at,
    updated_at: apiReport.updated_at,
    items,
  };
}

export function AdminReportGrid() {
  const [date, setDate] = useState<string>(getPhtDate);
  const [filterBuilderId, setFilterBuilderId] = useState<string>("all");
  const [members, setMembers] = useState<ActiveMember[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  // Fetch active members
  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("status", "active")
        .order("name");

      if (error) {
        console.error("Failed to fetch members:", error.message);
        setMembers([]);
      } else {
        setMembers(data ?? []);
      }
      setLoadingMembers(false);
    }

    loadMembers();
  }, []);

  // Fetch daily reports for the selected date
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/daily-reports?date=${date}`);
      if (!res.ok) {
        console.error("Failed to fetch reports:", res.statusText);
        setReports([]);
        return;
      }

      const json = await res.json();
      const normalized = (json.reports as ApiReport[] ?? []).map(normalizeReport);
      setReports(normalized);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Build the report map: userId -> DailyReport
  const reportByUser = new Map<string, DailyReport>();
  for (const report of reports) {
    reportByUser.set(report.user_id, report);
  }

  // Filter members by selected builder
  const filteredMembers =
    filterBuilderId === "all"
      ? members
      : members.filter((m) => m.id === filterBuilderId);

  const submittedCount = filteredMembers.filter((m) => reportByUser.has(m.id)).length;
  const missingCount = filteredMembers.length - submittedCount;

  const builderOptions = [
    { value: "all", label: "All Builders" },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ];

  const handleGenerateReport = () => {
    // Placeholder — will be wired in Task 5.1
    console.log("Generate report clicked for date:", date);
  };

  const isLoading = loadingMembers || loadingReports;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <Input
            label="Report Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="max-w-[200px]"
          />

          <SelectField
            label="Builder"
            options={builderOptions}
            value={filterBuilderId}
            onChange={(e) => setFilterBuilderId(e.target.value)}
            className="max-w-[240px]"
          />

          <Button onClick={handleGenerateReport} className="shrink-0">
            <FileText size={16} />
            Generate Report
          </Button>
        </div>

        {/* Stats */}
        {!isLoading && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
            <Badge variant="active">{submittedCount} submitted</Badge>
            {missingCount > 0 && (
              <Badge variant="warning">{missingCount} missing</Badge>
            )}
            <span className="text-xs text-[var(--color-text-secondary)]">
              {filteredMembers.length} builder{filteredMembers.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[var(--radius)]" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMembers.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={40} />}
          title="No builders found"
          description="There are no active team members to show reports for."
        />
      )}

      {/* Report Grid */}
      {!isLoading && filteredMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <BuilderReportCard
              key={member.id}
              report={reportByUser.get(member.id) ?? null}
              builderName={member.name}
              avatarUrl={member.avatar_url}
            />
          ))}
        </div>
      )}
    </div>
  );
}
