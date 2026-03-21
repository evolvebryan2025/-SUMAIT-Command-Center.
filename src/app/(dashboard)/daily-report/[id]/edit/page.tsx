"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import { AiReportEditor } from "@/components/reports/ai-report-editor";

interface Report {
  id: string;
  html_content: string;
  title?: string;
  status?: string;
}

export default function ReportEditPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: userLoading, isAdmin } = useUser();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportId = params?.id as string;

  useEffect(() => {
    if (userLoading) return;

    if (!profile) {
      router.push("/login");
      return;
    }

    if (!isAdmin) {
      router.push("/daily-report");
      return;
    }

    if (!reportId) return;

    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load report");
          return;
        }

        setReport(data.report);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [reportId, profile, userLoading, isAdmin, router]);

  if (userLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          <Skeleton className="flex-1 h-[600px]" />
          <Skeleton className="w-[400px] h-[600px] hidden lg:block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="text-[var(--color-primary)] hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)]">
        Report not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
        Edit Report
      </h1>
      <AiReportEditor reportId={report.id} initialHtml={report.html_content} />
    </div>
  );
}
