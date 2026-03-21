"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Search, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { formatDate, capitalize } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: { name: string; email: string } | null;
}

const ENTITY_TYPES = [
  { value: "", label: "All entities" },
  { value: "client", label: "Client" },
  { value: "task", label: "Task" },
  { value: "employee", label: "Employee" },
  { value: "profile", label: "Profile" },
  { value: "credential", label: "Credential" },
  { value: "knowledge_doc", label: "Knowledge Doc" },
];

const ACTION_TYPES = [
  { value: "", label: "All actions" },
  { value: "created", label: "Created" },
  { value: "invited", label: "Invited" },
  { value: "profile_updated", label: "Profile Updated" },
  { value: "avatar_updated", label: "Avatar Updated" },
  { value: "password_changed", label: "Password Changed" },
  { value: "global_sign_out", label: "Global Sign Out" },
  { value: "client_lifecycle_updated", label: "Lifecycle Updated" },
  { value: "knowledge_doc_updated", label: "Doc Updated" },
  { value: "knowledge_doc_deleted", label: "Doc Deleted" },
];

export default function AuditLogPage() {
  const { isAdmin, loading: userLoading } = useUser();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ value: string; label: string }[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch team members for user filter dropdown
  useEffect(() => {
    async function loadTeam() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("profiles").select("id, name").eq("is_active", true);
        setTeamMembers([
          { value: "", label: "All users" },
          ...(data ?? []).map((p: { id: string; name: string }) => ({ value: p.id, label: p.name })),
        ]);
      } catch { /* ignore */ }
    }
    loadTeam();
  }, []);

  const fetchLogs = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (actionType) params.set("action", actionType);
    if (entityType) params.set("entityType", entityType);
    if (userId) params.set("userId", userId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (isLoadMore) {
          setLogs((prev) => [...prev, ...data.logs]);
        } else {
          setLogs(data.logs);
        }
        setNextCursor(data.nextCursor);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, actionType, entityType, userId, startDate, endDate]);

  useEffect(() => {
    if (!userLoading && isAdmin) fetchLogs();
  }, [userLoading, isAdmin, fetchLogs]);

  const handleSearch = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!userLoading && !isAdmin) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[var(--color-text-secondary)]">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 rounded-[var(--radius)] hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
            Audit Log
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            View all system activity and changes.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Search"
            placeholder="Search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <SelectField
            label="Action Type"
            options={ACTION_TYPES}
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          />
          <SelectField
            label="Entity Type"
            options={ENTITY_TYPES}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
          {teamMembers.length > 1 && (
            <SelectField
              label="User"
              options={teamMembers}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          )}
          <Input
            label="From"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Button size="sm" onClick={handleSearch}>
            <Search size={14} className="mr-1" /> Search
          </Button>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
          No audit log entries found.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => (
            <Card key={entry.id} className="!p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {capitalize(entry.action)}
                      </span>
                      <Badge variant="neutral">{entry.entity_type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-secondary)]">
                      <span>{formatDate(entry.created_at)}</span>
                      {entry.profiles?.name && <span>by {entry.profiles.name}</span>}
                    </div>
                  </div>
                </div>
                {Object.keys(entry.metadata).length > 0 && (
                  expandedId === entry.id
                    ? <ChevronUp size={16} className="text-[var(--color-text-secondary)]" />
                    : <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
                )}
              </div>
              {expandedId === entry.id && Object.keys(entry.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <pre className="text-xs text-[var(--color-text-secondary)] overflow-x-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchLogs(nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
