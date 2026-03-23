"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { capitalize, formatDate, getHealthScoreColor } from "@/lib/utils";
import { STATUS_VARIANTS } from "@/lib/constants";
import type { Client } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs-wrapper";
import { ClientForm } from "@/components/clients/client-form";
import { ProjectsTab } from "@/components/clients/projects-tab";
import { ContactsTab } from "@/components/clients/contacts-tab";
import { KnowledgeDocsTab } from "@/components/clients/knowledge-docs-tab";
import { CredentialsTab } from "@/components/clients/credentials-tab";
import { LifecycleTab } from "@/components/clients/lifecycle-tab";
import { ActivityTab } from "@/components/clients/activity-tab";
import { ResourcesTab } from "@/components/clients/resources-tab";
import { PortalAccessTab } from "@/components/clients/portal-access-tab";
import Link from "next/link";
import { Users } from "lucide-react";
import { useUser } from "@/hooks/use-user";

interface ClientTabsProps {
  clientId: string;
}

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "projects", label: "Projects" },
  { value: "resources", label: "Resources" },
  { value: "contacts", label: "Contacts", adminOnly: true },
  { value: "knowledge", label: "Knowledge Base" },
  { value: "credentials", label: "Vault", adminOnly: true },
  { value: "lifecycle", label: "Lifecycle" },
  { value: "activity", label: "Activity" },
  { value: "portal", label: "Portal", adminOnly: true },
];

export function ClientTabs({ clientId }: ClientTabsProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { isAdmin } = useUser();

  const filteredTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setClient(data);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleSave = useCallback(() => {
    setEditing(false);
    fetchClient();
  }, [fetchClient]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <EmptyState
        title="Client not found"
        description={error ?? "This client does not exist or has been removed."}
        action={
          <Button onClick={fetchClient}>Retry</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          {client.name}
        </h1>
        {client.company && (
          <p className="text-[var(--color-text-secondary)]">{client.company}</p>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          {filteredTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          {editing ? (
            <ClientForm client={client} onSave={handleSave} />
          ) : (
            <OverviewPanel client={client} onEdit={() => setEditing(true)} isAdmin={isAdmin} />
          )}
        </TabsContent>

        {/* Projects tab */}
        <TabsContent value="projects">
          <ProjectsTab clientId={clientId} />
        </TabsContent>

        {/* Resources tab */}
        <TabsContent value="resources">
          <ResourcesTab clientId={clientId} />
        </TabsContent>

        {/* Contacts tab (admin only) */}
        {isAdmin && (
          <TabsContent value="contacts">
            <ContactsTab clientId={clientId} />
          </TabsContent>
        )}

        {/* Knowledge Base tab */}
        <TabsContent value="knowledge">
          <KnowledgeDocsTab
            clientId={clientId}

          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="credentials">
            <CredentialsTab clientId={clientId} />
          </TabsContent>
        )}

        <TabsContent value="lifecycle">
          <LifecycleTab clientId={clientId} client={client} onClientUpdated={fetchClient} />
        </TabsContent>

        {/* Activity tab */}
        <TabsContent value="activity">
          <ActivityTab clientId={clientId} />
        </TabsContent>

        {/* Portal access tab (admin only) */}
        {isAdmin && client && (
          <TabsContent value="portal">
            <PortalAccessTab client={client} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function OverviewPanel({ client, onEdit, isAdmin }: { client: Client; onEdit: () => void; isAdmin: boolean }) {
  const healthColor = getHealthScoreColor(client.health_score);
  const [parentClient, setParentClient] = useState<{ id: string; name: string } | null>(null);
  const [subClients, setSubClients] = useState<{ id: string; name: string; company: string | null; health_score: number }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (client.parent_client_id) {
      supabase
        .from("clients")
        .select("id, name")
        .eq("id", client.parent_client_id)
        .single()
        .then(({ data }) => { if (data) setParentClient(data); });
    }
    supabase
      .from("clients")
      .select("id, name, company, health_score")
      .eq("parent_client_id", client.id)
      .order("name")
      .then(({ data }) => setSubClients(data ?? []));
  }, [client.id, client.parent_client_id]);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-end">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Edit Client
          </Button>
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoRow label="Status">
            <Badge variant={STATUS_VARIANTS[client.status] ?? "neutral"}>
              {capitalize(client.status)}
            </Badge>
          </InfoRow>

          <InfoRow label="Health Score">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.1)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${client.health_score}%`,
                    backgroundColor: healthColor,
                  }}
                />
              </div>
              <span className="text-sm font-medium" style={{ color: healthColor }}>
                {client.health_score}%
              </span>
            </div>
          </InfoRow>

          <InfoRow label="Lifecycle Stage">
            <Badge variant={client.lifecycle_stage === "active" ? "active" : client.lifecycle_stage === "at_risk" ? "danger" : client.lifecycle_stage === "onboarding" ? "warning" : "neutral"}>
              {capitalize((client.lifecycle_stage ?? "prospect").replace(/_/g, " "))}
            </Badge>
          </InfoRow>

          <InfoRow label="Monthly Value">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              ${(client.monthly_value ?? 0).toLocaleString()}
            </span>
          </InfoRow>

          {isAdmin && (
            <InfoRow label="Email">
              <span className="text-sm text-[var(--color-text)]">
                {client.email ?? "Not set"}
              </span>
            </InfoRow>
          )}

          <InfoRow label="Company">
            <span className="text-sm text-[var(--color-text)]">
              {client.company ?? "Not set"}
            </span>
          </InfoRow>

          <InfoRow label="Created">
            <span className="text-sm text-[var(--color-text)]">
              {formatDate(client.created_at)}
            </span>
          </InfoRow>

          <InfoRow label="Last Updated">
            <span className="text-sm text-[var(--color-text)]">
              {formatDate(client.updated_at)}
            </span>
          </InfoRow>
        </div>

        {client.notes && (
          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Notes
            </h4>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}
      </Card>

      {/* Parent client link */}
      {parentClient && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[var(--color-text-secondary)]" />
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)]">Parent Client</h4>
          </div>
          <Link
            href={`/clients/${parentClient.id}`}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            {parentClient.name}
          </Link>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            This is a sub-client (client of a client).
          </p>
        </Card>
      )}

      {/* Sub-clients list */}
      {subClients.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[var(--color-text-secondary)]" />
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)]">
              Sub-Clients ({subClients.length})
            </h4>
          </div>
          <div className="space-y-2">
            {subClients.map((sub) => (
              <Link
                key={sub.id}
                href={`/clients/${sub.id}`}
                className="flex items-center justify-between p-2 rounded-[var(--radius)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-[var(--color-text)]">{sub.name}</span>
                  {sub.company && (
                    <span className="text-xs text-[var(--color-text-secondary)] ml-2">{sub.company}</span>
                  )}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: getHealthScoreColor(sub.health_score) }}
                >
                  {sub.health_score}%
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </span>
      {children}
    </div>
  );
}
