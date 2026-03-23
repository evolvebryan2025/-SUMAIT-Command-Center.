"use client";

import { useState, useCallback } from "react";
import { Sparkles, ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface SuggestedTask {
  readonly title: string;
  readonly description: string;
  readonly priority: "low" | "medium" | "high" | "urgent";
  readonly suggested_assignee: string | null;
}

const PRIORITY_BADGE_VARIANT: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export function TaskSuggestions({ onTaskCreated }: { readonly onTaskCreated?: () => void }) {
  const { isAdmin } = useUser();
  const { toast } = useToast();

  const [isExpanded, setIsExpanded] = useState(false);
  const [context, setContext] = useState("");
  const [suggestions, setSuggestions] = useState<readonly SuggestedTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);

  const handleGenerate = useCallback(async () => {
    const trimmed = context.trim();
    if (!trimmed) {
      toast("Please enter meeting notes or context.", "error");
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);

    try {
      const res = await fetch("/api/ai/suggest-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Failed to generate suggestions", "error");
        return;
      }

      if (!data.tasks || data.tasks.length === 0) {
        toast("No tasks could be generated from the provided context.", "info");
        return;
      }

      setSuggestions(data.tasks);
      toast(`Generated ${data.tasks.length} task suggestion(s)`, "success");
    } catch {
      toast("Failed to connect to AI service", "error");
    } finally {
      setIsGenerating(false);
    }
  }, [context, toast]);

  const handleCreateTask = useCallback(
    async (task: SuggestedTask, index: number) => {
      setCreatingIndex(index);

      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: "pending",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast(data.error ?? "Failed to create task", "error");
          return;
        }

        toast(`Task "${task.title}" created`, "success");

        // Remove the created task from suggestions
        setSuggestions((prev) => prev.filter((_, i) => i !== index));
        onTaskCreated?.();
      } catch {
        toast("Failed to create task", "error");
      } finally {
        setCreatingIndex(null);
      }
    },
    [toast, onTaskCreated]
  );

  if (!isAdmin) return null;

  return (
    <Card className="overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
            AI Task Suggestions
          </h2>
          <Badge variant="info">Beta</Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-[var(--color-text-secondary)]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[var(--color-text-secondary)]" />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          <Textarea
            label="Paste meeting notes or context"
            placeholder="E.g., 'Met with Kyle about redesigning the landing page. Need to update copy, add testimonials, and fix mobile layout. Prince to handle the animations. Due by end of month.'"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={4}
          />

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !context.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Tasks
              </>
            )}
          </Button>

          {/* Loading skeleton */}
          {isGenerating && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {/* Suggested tasks */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {suggestions.length} suggestion(s) — click &quot;Create Task&quot; to add to your task list.
              </p>
              {suggestions.map((task, index) => (
                <div
                  key={`${task.title}-${index}`}
                  className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">
                          {task.title}
                        </h4>
                        <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      {task.suggested_assignee && (
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          Suggested assignee: <span className="font-medium text-[var(--color-text)]">{task.suggested_assignee}</span>
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreateTask(task, index)}
                      disabled={creatingIndex === index}
                    >
                      {creatingIndex === index ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Create Task
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
