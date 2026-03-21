"use client";

import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportForm } from "@/components/daily-reports/report-form";
import { AdminReportGrid } from "@/components/daily-reports/admin-report-grid";

export default function DailyReportPage() {
  const { profile, loading, isAdmin } = useUser();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)]">
        Please sign in to view daily reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
        {isAdmin ? "Daily Reports" : "Daily Report"}
      </h1>

      {isAdmin ? <AdminReportGrid /> : <ReportForm />}
    </div>
  );
}
