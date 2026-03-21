"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TASK_PRIORITIES } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import type { Task, Profile, Client } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField } from "@/components/ui/select-field";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { DayDetailPanel } from "@/components/calendar/day-detail-panel";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Day detail panel
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Calculate date range for the visible month
    const startDate = `${year}-${pad2(month + 1)}-01`;
    const endYear = month === 11 ? year + 1 : year;
    const endMonth = month === 11 ? 1 : month + 2;
    const endDate = `${endYear}-${pad2(endMonth)}-01`;

    const [tasksRes, profilesRes, clientsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .gte("due_date", startDate)
        .lt("due_date", endDate)
        .neq("status", "completed")
        .order("due_date", { ascending: true }),
      supabase.from("profiles").select("*").eq("is_active", true).limit(100),
      supabase.from("clients").select("*").limit(500),
    ]);

    if (tasksRes.error) {
      setError(tasksRes.error.message);
      setLoading(false);
      return;
    }

    setTasks(tasksRes.data ?? []);

    const profileMap: Record<string, Profile> = {};
    for (const p of profilesRes.data ?? []) {
      profileMap[p.id] = p;
    }
    setProfiles(profileMap);

    const clientMap: Record<string, Client> = {};
    for (const c of clientsRes.data ?? []) {
      clientMap[c.id] = c;
    }
    setClients(clientMap);

    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevMonth = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const goToNextMonth = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }, [month]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterAssignee !== "all" && t.assigned_to !== filterAssignee) return false;
      if (filterClient !== "all" && t.client_id !== filterClient) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterAssignee, filterClient, filterPriority]);

  // Filter options
  const assigneeOptions = useMemo(
    () => [
      { value: "all", label: "All Assignees" },
      ...Object.values(profiles).map((p) => ({ value: p.id, label: p.name })),
    ],
    [profiles]
  );

  const clientOptions = useMemo(
    () => [
      { value: "all", label: "All Clients" },
      ...Object.values(clients).map((c) => ({ value: c.id, label: c.name })),
    ],
    [clients]
  );

  const priorityOptions = useMemo(
    () => [
      { value: "all", label: "All Priorities" },
      ...TASK_PRIORITIES.map((p) => ({ value: p, label: capitalize(p) })),
    ],
    []
  );

  // Tasks for the selected date detail panel
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTasks.filter(
      (t) => t.due_date && t.due_date.slice(0, 10) === selectedDate
    );
  }, [selectedDate, filteredTasks]);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedDate(null);
  }, []);

  if (error) {
    return (
      <EmptyState
        title="Failed to load calendar"
        description={error}
        action={
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:brightness-110 transition-all cursor-pointer"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Calendar
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <h2 className="text-lg font-semibold font-[var(--font-heading)] text-[var(--color-text)] min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={goToToday}
            className="ml-2 px-3 py-2 text-xs rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <SelectField
            options={assigneeOptions}
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          />
        </div>
        <div className="w-44">
          <SelectField
            options={clientOptions}
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          />
        </div>
        <div className="w-44">
          <SelectField
            options={priorityOptions}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTasks.length === 0 && (
        <EmptyState
          icon={<CalendarDays size={40} />}
          title="No tasks with due dates"
          description="Tasks with due dates in this month will appear on the calendar."
        />
      )}

      {/* Calendar grid (show even when empty for navigation context) */}
      {!loading && (
        <CalendarGrid
          year={year}
          month={month}
          tasks={filteredTasks}
          onDateClick={handleDateClick}
        />
      )}

      {/* Day detail panel */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          tasks={selectedDateTasks}
          onClose={handleClosePanel}
          profiles={profiles}
        />
      )}
    </div>
  );
}
