"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CLIENT_STATUSES, STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, cn, getHealthScoreColor } from "@/lib/utils";
import type { Client } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .order("updated_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setClients(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
    const query = search.toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.company ?? "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Statuses" },
      ...CLIENT_STATUSES.map((s) => ({ value: s, label: capitalize(s) })),
    ],
    []
  );

  if (error) {
    return (
      <EmptyState
        title="Failed to load clients"
        description={error}
        action={<Button onClick={fetchClients}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Clients
        </h1>
        <Link href="/clients/new">
          <Button>Add Client</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <SelectField
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredClients.length === 0 && (
        <EmptyState
          title="No clients found"
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your search or filter."
              : "Get started by adding your first client."
          }
          action={
            !search && statusFilter === "all" ? (
              <Link href="/clients/new">
                <Button>Add Client</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {/* Client grid */}
      {!loading && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const parent = client.parent_client_id
              ? clients.find((c) => c.id === client.parent_client_id)
              : undefined;
            return (
              <ClientCard
                key={client.id}
                client={client}
                parentName={parent?.name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, parentName }: { client: Client; parentName?: string }) {
  const healthColor = getHealthScoreColor(client.health_score);

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="hover:border-[var(--color-primary)] transition-colors cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--color-text)] truncate">
              {client.name}
            </h3>
            {client.company && (
              <p className="text-sm text-[var(--color-text-secondary)] truncate">
                {client.company}
              </p>
            )}
            {parentName && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1">
                <Users size={12} />
                Sub-client of {parentName}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={STATUS_VARIANTS[client.status] ?? "neutral"}>
              {capitalize(client.status)}
            </Badge>
            {client.parent_client_id && (
              <Badge variant="neutral" className="text-[10px]">Sub-client</Badge>
            )}
          </div>
        </div>

        {/* Health score bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Health Score
            </span>
            <span className="text-xs font-medium" style={{ color: healthColor }}>
              {client.health_score}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.1)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${client.health_score}%`,
                backgroundColor: healthColor,
              }}
            />
          </div>
        </div>

        {client.email && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-3 truncate">
            {client.email}
          </p>
        )}
      </Card>
    </Link>
  );
}
