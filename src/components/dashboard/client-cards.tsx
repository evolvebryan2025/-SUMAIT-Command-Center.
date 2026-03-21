"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getHealthScoreColor, capitalize } from "@/lib/utils";
import { STATUS_VARIANTS } from "@/lib/constants";
import type { Client } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientWithCounts extends Client {
  project_count: number;
  task_count: number;
}

export function ClientCards() {
  const [clients, setClients] = useState<ClientWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      const supabase = createClient();

      const { data: clientRows } = await supabase
        .from("clients")
        .select("*")
        .neq("status", "archived")
        .order("name");

      if (!clientRows || clientRows.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const clientIds = clientRows.map((c) => c.id);

      const [projectsRes, tasksRes] = await Promise.all([
        supabase
          .from("projects")
          .select("client_id")
          .in("client_id", clientIds),
        supabase
          .from("tasks")
          .select("client_id")
          .in("client_id", clientIds)
          .in("status", ["pending", "in_progress"]),
      ]);

      const projectCounts = new Map<string, number>();
      for (const p of projectsRes.data ?? []) {
        projectCounts.set(p.client_id, (projectCounts.get(p.client_id) ?? 0) + 1);
      }

      const taskCounts = new Map<string, number>();
      for (const t of tasksRes.data ?? []) {
        if (t.client_id) {
          taskCounts.set(t.client_id, (taskCounts.get(t.client_id) ?? 0) + 1);
        }
      }

      const enriched: ClientWithCounts[] = clientRows.map((c) => ({
        ...c,
        project_count: projectCounts.get(c.id) ?? 0,
        task_count: taskCounts.get(c.id) ?? 0,
      }));

      setClients(enriched);
      setLoading(false);
    }

    fetchClients();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-[rgba(255,255,255,0.03)] space-y-3"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clients</CardTitle>
      </CardHeader>
      {clients.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] py-4">
          No active clients
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="block p-4 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">
                    {client.name}
                  </p>
                  {client.company && (
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      {client.company}
                    </p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANTS[client.status]}>
                  {capitalize(client.status)}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-1">
                  <span>Health</span>
                  <span>{client.health_score}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.1)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${client.health_score}%`,
                      backgroundColor: getHealthScoreColor(client.health_score),
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-[var(--color-text-secondary)]">
                <span>{client.project_count} projects</span>
                <span>{client.task_count} active tasks</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
