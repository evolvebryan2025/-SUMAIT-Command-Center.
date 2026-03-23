"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BriefAction } from "@/lib/types";

interface RecommendedActionsProps {
  actions: BriefAction[];
  onUpdate: () => void;
}

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

export function RecommendedActions({ actions, onUpdate }: RecommendedActionsProps) {
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const handleAction = async (action: BriefAction, createTask: boolean) => {
    setUpdating((prev) => new Set(prev).add(action.id));

    try {
      const res = await fetch("/api/morning-brief/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: action.id,
          status: createTask ? "task_created" : "acknowledged",
          create_task: createTask,
        }),
      });
      if (res.ok) onUpdate();
    } catch {
      // Revert on failure
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  };

  if (actions.length === 0) return null;

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
          Recommended Actions
        </h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {actions.map((action, idx) => {
          const isUpdating = updating.has(action.id);
          const isDone = action.status !== "pending";

          return (
            <div
              key={action.id}
              className={`flex items-start gap-3 px-4 py-3 ${isDone ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => handleAction(action, false)}
                disabled={isUpdating || isDone}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer mt-0.5"
              />
              <span className="text-sm text-[var(--color-text-secondary)] font-mono shrink-0">
                {idx + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-[var(--color-text)] ${isDone ? "line-through" : ""}`}>
                  {action.action_text}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0"
                style={{
                  color: priorityColors[action.priority],
                  backgroundColor: `${priorityColors[action.priority]}15`,
                }}
              >
                {action.priority}
              </span>
              {!isDone && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAction(action, true)}
                  disabled={isUpdating}
                  className="shrink-0"
                >
                  <Plus size={12} />
                  Task
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
