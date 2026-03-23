"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { MorningBriefData } from "@/lib/types";
import { BriefHeader } from "@/components/morning-brief/brief-header";
import { KpiCards } from "@/components/morning-brief/kpi-cards";
import { ClientDashboard } from "@/components/morning-brief/client-dashboard";
import { AlertsSection } from "@/components/morning-brief/alerts-section";
import { RecommendedActions } from "@/components/morning-brief/recommended-actions";
import { DelegationDraft } from "@/components/morning-brief/delegation-draft";

export default function MorningBriefPage() {
  const { profile, loading: userLoading, isAdmin } = useUser();
  const [brief, setBrief] = useState<MorningBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/morning-brief?date=${selectedDate}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load brief");
      }
      const data = await res.json();
      setBrief(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load brief";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!userLoading && profile) fetchBrief();
  }, [userLoading, profile, fetchBrief]);

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)]">
        Morning Brief is available to admins only.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BriefHeader
        date={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={fetchBrief}
        loading={loading}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {brief && (
        <>
          <KpiCards kpis={brief.kpis} />
          <ClientDashboard clients={brief.client_dashboard} />
          <AlertsSection alerts={brief.alerts} onResolve={fetchBrief} />
          <RecommendedActions actions={brief.recommended_actions} onUpdate={fetchBrief} />
          <DelegationDraft delegation={brief.delegation} onApprove={fetchBrief} />
        </>
      )}
    </div>
  );
}
