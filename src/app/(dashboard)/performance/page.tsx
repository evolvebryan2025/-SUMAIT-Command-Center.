"use client";

import { PerformanceDashboard } from "@/components/performance/performance-dashboard";

export default function PerformancePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-2">
        Performance
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Team performance metrics and completion tracking.
      </p>

      <PerformanceDashboard />
    </div>
  );
}
