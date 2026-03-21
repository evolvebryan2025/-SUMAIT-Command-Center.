"use client";

import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import { BuilderDashboard } from "@/components/dashboard/builder-dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { ClientCards } from "@/components/dashboard/client-cards";
import { TeamWorkload } from "@/components/dashboard/team-workload";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TaskTrendChart } from "@/components/dashboard/task-trend-chart";
import { ClientHealthChart } from "@/components/dashboard/client-health-chart";
import { TeamPerformanceChart } from "@/components/dashboard/team-performance-chart";

function AdminDashboard() {
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

export default function DashboardPage() {
  const { isAdmin, loading } = useUser();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return isAdmin ? <AdminDashboard /> : <BuilderDashboard />;
}
