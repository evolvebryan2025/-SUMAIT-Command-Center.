"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/lib/types";

interface MemberStats {
  profile: Profile;
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number;
  dailyReportsSubmitted: number;
  activeBlockers: number;
}

interface TeamSummary {
  totalCompleted: number;
  avgCompletionRate: number;
  reportSubmissionRate: number;
  totalBlockers: number;
}

function getCompletionVariant(rate: number): "active" | "warning" | "danger" {
  if (rate > 80) return "active";
  if (rate >= 50) return "warning";
  return "danger";
}

function getCompletionColor(rate: number): string {
  if (rate > 80) return "border-l-[#22c55e]";
  if (rate >= 50) return "border-l-[#eab308]";
  return "border-l-[#ef4444]";
}

function countWorkdays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function PerformanceDashboard() {
  const { profile, loading: userLoading, isAdmin } = useUser();
  const router = useRouter();
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary>({
    totalCompleted: 0,
    avgCompletionRate: 0,
    reportSubmissionRate: 0,
    totalBlockers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!isAdmin) {
      router.replace("/");
      return;
    }

    async function fetchData() {
      const supabase = createClient();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split("T")[0];

      // Fetch active non-admin profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .neq("role", "admin");

      if (!profiles || profiles.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch tasks assigned to these members in last 30 days
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, status, assigned_to, created_at, completed_at")
        .in("assigned_to", profiles.map((p) => p.id))
        .gte("created_at", thirtyDaysAgoISO);

      // Fetch daily reports in last 30 days
      const { data: dailyReports } = await supabase
        .from("daily_reports")
        .select("id, user_id, report_date")
        .in("user_id", profiles.map((p) => p.id))
        .gte("report_date", thirtyDaysAgoISO);

      // Fetch active blockers (unresolved blocker comments)
      const { data: blockers } = await supabase
        .from("task_comments")
        .select("id, author_id")
        .eq("comment_type", "blocker")
        .eq("is_resolved", false)
        .in("author_id", profiles.map((p) => p.id));

      const now = new Date();
      const workdaysInPeriod = countWorkdays(thirtyDaysAgo, now);

      const stats: MemberStats[] = profiles.map((p) => {
        const memberTasks = (tasks ?? []).filter((t) => t.assigned_to === p.id);
        const completed = memberTasks.filter((t) => t.status === "completed").length;
        const total = memberTasks.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const reports = (dailyReports ?? []).filter((r) => r.user_id === p.id);
        const memberBlockers = (blockers ?? []).filter((b) => b.author_id === p.id);

        return {
          profile: p,
          tasksCompleted: completed,
          tasksTotal: total,
          completionRate: rate,
          dailyReportsSubmitted: reports.length,
          activeBlockers: memberBlockers.length,
        };
      });

      // Sort by completion rate descending
      stats.sort((a, b) => b.completionRate - a.completionRate);

      const totalCompleted = stats.reduce((sum, s) => sum + s.tasksCompleted, 0);
      const avgRate =
        stats.length > 0
          ? Math.round(stats.reduce((sum, s) => sum + s.completionRate, 0) / stats.length)
          : 0;
      const totalReports = stats.reduce((sum, s) => sum + s.dailyReportsSubmitted, 0);
      const maxPossibleReports = stats.length * workdaysInPeriod;
      const reportRate =
        maxPossibleReports > 0 ? Math.round((totalReports / maxPossibleReports) * 100) : 0;
      const totalBlockers = stats.reduce((sum, s) => sum + s.activeBlockers, 0);

      setMemberStats(stats);
      setTeamSummary({
        totalCompleted,
        avgCompletionRate: avgRate,
        reportSubmissionRate: reportRate,
        totalBlockers,
      });
      setLoading(false);
    }

    fetchData();
  }, [userLoading, isAdmin, router]);

  if (userLoading || (!isAdmin && !loading)) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const workdaysInPeriod = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return countWorkdays(d, new Date());
  })();

  return (
    <div className="space-y-6">
      {/* Team Summary Stats */}
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
            Tasks Completed
          </p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {teamSummary.totalCompleted}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Last 30 days</p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
            Avg Completion Rate
          </p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {teamSummary.avgCompletionRate}%
          </p>
          <Badge variant={getCompletionVariant(teamSummary.avgCompletionRate)} className="mt-1">
            {teamSummary.avgCompletionRate > 80 ? "On Track" : teamSummary.avgCompletionRate >= 50 ? "Needs Attention" : "At Risk"}
          </Badge>
        </Card>

        <Card>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
            Report Submission
          </p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {teamSummary.reportSubmissionRate}%
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Daily reports filed</p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
            Active Blockers
          </p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {teamSummary.totalBlockers}
          </p>
          {teamSummary.totalBlockers > 0 && (
            <Badge variant="danger" className="mt-1">Needs Resolution</Badge>
          )}
        </Card>
      </div>

      {/* Member Performance Cards */}
      <div>
        <h2 className="text-lg font-semibold font-[var(--font-heading)] text-[var(--color-text)] mb-4">
          Member Performance
        </h2>

        {memberStats.length === 0 ? (
          <Card>
            <p className="text-[var(--color-text-secondary)] text-center py-8">
              No active team members found.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {memberStats.map((member) => (
              <Card
                key={member.profile.id}
                className={`border-l-4 ${getCompletionColor(member.completionRate)}`}
              >
                <CardHeader className="mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {member.profile.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{member.profile.name}</CardTitle>
                      <p className="text-xs text-[var(--color-text-secondary)] capitalize">
                        {member.profile.role}
                      </p>
                    </div>
                    <Badge variant={getCompletionVariant(member.completionRate)}>
                      {member.completionRate}%
                    </Badge>
                  </div>
                </CardHeader>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Tasks Completed</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {member.tasksCompleted}
                      <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                        {" "}/ {member.tasksTotal}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Completion Rate</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {member.completionRate}%
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Daily Reports</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {member.dailyReportsSubmitted}
                      <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                        {" "}/ {workdaysInPeriod}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Active Blockers</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {member.activeBlockers > 0 ? (
                        <span className="text-[#ef4444]">{member.activeBlockers}</span>
                      ) : (
                        <span>0</span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
