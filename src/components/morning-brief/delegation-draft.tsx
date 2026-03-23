"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MorningBriefData, DelegationSuggestion } from "@/lib/types";

interface DelegationDraftProps {
  delegation: MorningBriefData["delegation"];
  onApprove: () => void;
}

const priorityColors: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

export function DelegationDraft({ delegation, onApprove }: DelegationDraftProps) {
  const [approving, setApproving] = useState(false);
  const [approvedEmployees, setApprovedEmployees] = useState<Set<string>>(new Set());

  const grouped = delegation.suggestions.reduce<Record<string, DelegationSuggestion[]>>(
    (acc, s) => {
      const key = s.employee_id || "unassigned";
      const updated = { ...acc };
      if (!updated[key]) updated[key] = [];
      updated[key] = [...(updated[key] || []), s];
      return updated;
    },
    {}
  );

  const handleApproveEmployee = async (employeeId: string, suggestions: DelegationSuggestion[]) => {
    setApproving(true);
    try {
      const res = await fetch("/api/morning-brief/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions }),
      });
      if (res.ok) {
        setApprovedEmployees((prev) => new Set(prev).add(employeeId));
        onApprove();
      }
    } catch {
      // Handle error
    } finally {
      setApproving(false);
    }
  };

  const handleApproveAll = async () => {
    setApproving(true);
    try {
      const res = await fetch("/api/morning-brief/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: delegation.suggestions }),
      });
      if (res.ok) {
        const allIds = new Set(Object.keys(grouped));
        setApprovedEmployees(allIds);
        onApprove();
      }
    } catch {
      // Handle error
    } finally {
      setApproving(false);
    }
  };

  if (delegation.suggestions.length === 0) return null;

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
            Task Delegation
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 uppercase tracking-wider">
            DRAFT — Requires Approval
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleApproveAll}
          disabled={approving}
        >
          {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Approve All
        </Button>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {Object.entries(grouped).map(([employeeId, suggestions]) => {
          const isApproved = approvedEmployees.has(employeeId);
          const employeeName = suggestions[0]?.employee_name || "Unassigned";

          return (
            <div key={employeeId} className={isApproved ? "opacity-50" : ""}>
              <div className="px-4 py-2 flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {employeeName}
                </span>
                {!isApproved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleApproveEmployee(employeeId, suggestions)}
                    disabled={approving}
                  >
                    Approve
                  </Button>
                )}
                {isApproved && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Approved
                  </span>
                )}
              </div>
              <div className="px-6 py-2 space-y-2">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{
                        color: priorityColors[s.priority] || "#6b7280",
                        backgroundColor: `${priorityColors[s.priority] || "#6b7280"}15`,
                      }}
                    >
                      {s.priority}
                    </span>
                    <span className="text-[var(--color-text)]">{s.task_title}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {s.client_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
