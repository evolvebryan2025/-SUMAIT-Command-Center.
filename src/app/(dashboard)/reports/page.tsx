"use client";

import { useState } from "react";
import { ReportGenerator } from "@/components/reports/report-generator";
import { ReportViewer } from "@/components/reports/report-viewer";
import { ReportHistory } from "@/components/reports/report-history";
import type { GeneratedReport } from "@/lib/types";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleGenerated(report: GeneratedReport) {
    setSelectedReport(report);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-2">
        Reports
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Generate and view branded reports.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <ReportGenerator onGenerated={handleGenerated} />
          <ReportHistory
            onSelect={setSelectedReport}
            onDeleted={() => { setSelectedReport(null); setRefreshKey((k) => k + 1); }}
            refreshKey={refreshKey}
          />
        </div>
        <div className="lg:col-span-2">
          {selectedReport ? (
            <ReportViewer report={selectedReport} />
          ) : (
            <div className="rounded-[var(--radius)] bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] p-12 text-center">
              <p className="text-[var(--color-text-secondary)]">
                Select a report or generate a new one to view it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
