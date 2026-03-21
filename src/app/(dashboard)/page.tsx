"use client";

import { KpiCards } from "@/components/dashboard/kpi-cards";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { ClientCards } from "@/components/dashboard/client-cards";
import { TeamWorkload } from "@/components/dashboard/team-workload";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TaskTrendChart } from "@/components/dashboard/task-trend-chart";
import { ClientHealthChart } from "@/components/dashboard/client-health-chart";
import { TeamPerformanceChart } from "@/components/dashboard/team-performance-chart";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-2">
          Dashboard
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Welcome to the SUMAIT Command Center.
        </p>
      </div>
      <KpiCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AlertsPanel />
          <ClientCards />
        </div>
        <div className="space-y-6">
          <TeamWorkload />
          <ActivityFeed />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-4">
          Analytics
        </h2>
        <div className="space-y-6">
          <TaskTrendChart />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientHealthChart />
            <TeamPerformanceChart />
          </div>
        </div>
      </div>
    </div>
  );
}
