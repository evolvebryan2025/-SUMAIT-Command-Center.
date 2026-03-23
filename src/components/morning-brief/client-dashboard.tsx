"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MorningBriefData } from "@/lib/types";

interface ClientDashboardProps {
  clients: MorningBriefData["client_dashboard"];
}

const statusColors: Record<string, string> = {
  "ON TRACK": "#22c55e",
  "NEEDS ATTENTION": "#f59e0b",
  "AT RISK": "#ef4444",
  "NO DATA": "#6b7280",
};

export function ClientDashboard({ clients }: ClientDashboardProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
          Client Dashboard
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <th className="text-left px-4 py-2 font-medium w-8"></th>
              <th className="text-left px-4 py-2 font-medium">Client</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Health</th>
              <th className="text-center px-4 py-2 font-medium">Done</th>
              <th className="text-center px-4 py-2 font-medium">Pending</th>
              <th className="text-center px-4 py-2 font-medium">Blockers</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const isExpanded = expanded.has(client.id);
              return (
                <Fragment key={client.id}>
                  <tr
                    className="border-b border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                    onClick={() => toggle(client.id)}
                  >
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)] font-medium">{client.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          color: statusColors[client.status],
                          backgroundColor: `${statusColors[client.status]}15`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusColors[client.status] }}
                        />
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${client.health_score ?? 0}%`,
                              backgroundColor: statusColors[client.status],
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {client.health_score ?? "\u2014"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-green-400">{client.completed_today}</td>
                    <td className="px-4 py-3 text-center text-yellow-400">{client.pending}</td>
                    <td className="px-4 py-3 text-center text-red-400">{client.blockers}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-[var(--color-border)]">
                      <td colSpan={7} className="px-8 py-3 bg-[rgba(255,255,255,0.02)]">
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Projects: {client.projects.length > 0 ? client.projects.join(", ") : "None tracked"}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No active clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
