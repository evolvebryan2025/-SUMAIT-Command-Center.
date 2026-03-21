"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, ClipboardList, MessageCircle, Clock, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface Step {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly description: string;
  readonly details: readonly string[];
}

const STEPS: readonly Step[] = [
  {
    title: "Your Tasks",
    icon: CheckSquare,
    description: "Your task list is your daily command center.",
    details: [
      "View all tasks assigned to you from the Tasks page.",
      "Update status as you work: Pending, In Progress, Completed, or Blocked.",
      "Create new tasks when you identify work that needs tracking.",
    ],
  },
  {
    title: "Daily Reports",
    icon: ClipboardList,
    description: "Submit a daily report so the team stays aligned.",
    details: [
      "Go to Daily Report each day to log what you completed.",
      "Attach screenshots or files as evidence of your work.",
      "Add relevant links (Vercel deployments, PRs, docs).",
    ],
  },
  {
    title: "Comments & Questions",
    icon: MessageCircle,
    description: "Communicate directly on tasks to keep context in one place.",
    details: [
      "Leave comments on any task for updates or notes.",
      "Post a question if you need clarification before proceeding.",
      "Flag blockers immediately so the team can help unblock you.",
    ],
  },
  {
    title: "Deadlines",
    icon: Clock,
    description: "Stay on top of due dates and priority badges.",
    details: [
      "Tasks show colored badges: urgent (red), high (orange), medium (yellow), low (gray).",
      "Overdue tasks are flagged automatically — keep statuses current.",
      "Check the Calendar view for a visual timeline of upcoming deadlines.",
    ],
  },
  {
    title: "You're Ready!",
    icon: Rocket,
    description: "You now know the essentials. Time to get to work.",
    details: [
      "Check your task list each morning.",
      "Submit your daily report before end of day.",
      "Ask questions early — don't wait until you're stuck.",
    ],
  },
] as const;

export function Walkthrough() {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  async function handleComplete() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarded_at: new Date().toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Failed to save onboarding:", data.error);
      }
      router.push("/");
    } catch (err) {
      console.error("Onboarding save error:", err);
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 cursor-pointer ${
              index === currentStep
                ? "bg-[var(--color-primary)] scale-110"
                : index < currentStep
                  ? "bg-[var(--color-primary)] opacity-50"
                  : "bg-[rgba(255,255,255,0.15)]"
            }`}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-center text-sm text-[var(--color-text-secondary)] mb-4">
        Step {currentStep + 1} of {STEPS.length}
      </p>

      {/* Step card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[rgba(var(--color-primary-rgb,99,102,241),0.15)] bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
            <step.icon size={28} className="text-[var(--color-primary)]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-text)] mb-2">
            {step.title}
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            {step.description}
          </p>
        </div>

        <ul className="space-y-3 mb-8">
          {step.details.map((detail, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]"
            >
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
              {detail}
            </li>
          ))}
        </ul>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isFirst}
            className={isFirst ? "invisible" : ""}
          >
            <ArrowLeft size={16} />
            Back
          </Button>

          {isLast ? (
            <Button onClick={handleComplete} disabled={saving} size="lg">
              {saving ? "Saving..." : "Got it"}
              <Rocket size={16} />
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep((s) => s + 1)}>
              Next
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
