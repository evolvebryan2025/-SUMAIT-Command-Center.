"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskPill } from "./task-pill";

interface CalendarGridProps {
  year: number;
  month: number;
  tasks: Task[];
  onDateClick: (date: string) => void;
}

interface CalendarDay {
  day: number;
  currentMonth: boolean;
  date: string;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PILLS = 3;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function generateCalendarDays(year: number, month: number): CalendarDay[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: CalendarDay[] = [];

  // Previous month padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthDays = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    days.push({
      day: d,
      currentMonth: false,
      date: `${prevYear}-${pad2(prevMonth + 1)}-${pad2(d)}`,
    });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      currentMonth: true,
      date: `${year}-${pad2(month + 1)}-${pad2(i)}`,
    });
  }

  // Next month padding (fill to 42 = 6 weeks)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = 42 - days.length;

  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      currentMonth: false,
      date: `${nextYear}-${pad2(nextMonth + 1)}-${pad2(i)}`,
    });
  }

  return days;
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function CalendarGrid({ year, month, tasks, onDateClick }: CalendarGridProps) {
  const calendarDays = useMemo(() => generateCalendarDays(year, month), [year, month]);
  const today = getToday();

  // Group tasks by due_date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!task.due_date) continue;
      const dateKey = task.due_date.slice(0, 10);
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(task);
    }
    return map;
  }, [tasks]);

  return (
    <>
      {/* Desktop grid */}
      <div className="hidden md:block">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((header) => (
            <div
              key={header}
              className="text-center text-xs font-medium text-[var(--color-text-secondary)] py-2"
            >
              {header}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 border-t border-l border-[var(--color-border)]">
          {calendarDays.map((calDay) => {
            const dayTasks = tasksByDate[calDay.date] ?? [];
            const isToday = calDay.date === today;
            const overflow = dayTasks.length - MAX_VISIBLE_PILLS;

            return (
              <button
                key={calDay.date}
                type="button"
                onClick={() => onDateClick(calDay.date)}
                className={cn(
                  "min-h-[100px] p-2 text-left border-r border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer flex flex-col",
                  isToday && "ring-1 ring-inset ring-[var(--color-primary)]"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full",
                    !calDay.currentMonth && "text-[var(--color-text-secondary)] opacity-40",
                    calDay.currentMonth && "text-[var(--color-text)]",
                    isToday && "bg-[var(--color-primary)] text-white"
                  )}
                >
                  {calDay.day}
                </span>

                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, MAX_VISIBLE_PILLS).map((task) => (
                    <TaskPill key={task.id} task={task} />
                  ))}
                  {overflow > 0 && (
                    <span className="text-[10px] text-[var(--color-text-secondary)] pl-1">
                      +{overflow} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile compact list */}
      <div className="md:hidden space-y-1">
        {calendarDays
          .filter((d) => d.currentMonth)
          .map((calDay) => {
            const dayTasks = tasksByDate[calDay.date] ?? [];
            const isToday = calDay.date === today;

            if (dayTasks.length === 0) return null;

            return (
              <button
                key={calDay.date}
                type="button"
                onClick={() => onDateClick(calDay.date)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer text-left",
                  isToday && "ring-1 ring-[var(--color-primary)]"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
                    isToday
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text)]"
                  )}
                >
                  {calDay.day}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text)] font-medium">
                    {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">
                    {dayTasks.map((t) => t.title).join(", ")}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </>
  );
}
