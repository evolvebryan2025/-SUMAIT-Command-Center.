"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Key, Plus, RotateCw, Trash2, X, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { capitalize, formatDate } from "@/lib/utils";
import type { Credential, CredentialType } from "@/lib/types";

interface CredentialsTabProps {
  clientId: string;
}

const CREDENTIAL_TYPES: CredentialType[] = [
  "api_key",
  "password",
  "oauth_token",
  "ssh_key",
  "certificate",
  "other",
];

const TYPE_ICONS: Record<string, string> = {
  api_key: "API",
  password: "PWD",
  oauth_token: "OAuth",
  ssh_key: "SSH",
  certificate: "CERT",
  other: "KEY",
};

export function CredentialsTab({ clientId }: CredentialsTabProps) {
  const { toast } = useToast();
  const { isAdmin } = useUser();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    label: "",
    credentialType: "api_key" as CredentialType,
    value: "",
    username: "",
    url: "",
    notes: "",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/credentials?clientId=${clientId}`);
    const data = await res.json();
    if (res.ok) {
      setCredentials(data.credentials ?? []);
    } else {
      toast(data.error ?? "Failed to load credentials", "error");
    }
    setLoading(false);
  }, [clientId, toast]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleAdd = useCallback(async () => {
    if (!form.label.trim() || !form.value.trim()) {
      toast("Label and value are required", "error");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        label: form.label.trim(),
        credentialType: form.credentialType,
        value: form.value.trim(),
        username: form.username.trim() || undefined,
        url: form.url.trim() || undefined,
        notes: form.notes.trim() || undefined,
        expiresAt: form.expiresAt || undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      toast("Credential saved securely", "success");
      setShowAddForm(false);
      setForm({ label: "", credentialType: "api_key", value: "", username: "", url: "", notes: "", expiresAt: "" });
      fetchCredentials();
    } else {
      toast(data.error ?? "Failed to save", "error");
    }
  }, [form, clientId, toast, fetchCredentials]);

  const handleReveal = useCallback(async (id: string) => {
    if (revealedIds[id]) {
      setRevealedIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    const res = await fetch(`/api/credentials/${id}`);
    const data = await res.json();
    if (res.ok) {
      setRevealedIds((prev) => ({ ...prev, [id]: data.credential.value }));
    }
  }, [revealedIds]);

  const handleCopy = useCallback(async (id: string) => {
    const value = revealedIds[id];
    if (!value) {
      // Need to reveal first
      const res = await fetch(`/api/credentials/${id}`);
      const data = await res.json();
      if (res.ok) {
        await navigator.clipboard.writeText(data.credential.value);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast("Copied to clipboard", "success");
      }
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast("Copied to clipboard", "success");
  }, [revealedIds, toast]);

  const handleDelete = useCallback(async (cred: Credential) => {
    if (!confirm(`Delete credential "${cred.label}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/credentials/${cred.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Credential deleted", "success");
      fetchCredentials();
    } else {
      const data = await res.json();
      toast(data.error ?? "Failed to delete", "error");
    }
  }, [toast, fetchCredentials]);

  const handleRotate = useCallback(async (cred: Credential) => {
    const newValue = prompt(`Enter new value for "${cred.label}":`);
    if (newValue === null) return; // cancelled
    if (!newValue.trim()) {
      toast("New value cannot be empty", "error");
      return;
    }

    const res = await fetch(`/api/credentials/${cred.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue.trim() }),
    });

    if (res.ok) {
      toast("Credential rotated successfully", "success");
      fetchCredentials();
    } else {
      const data = await res.json();
      toast(data.error ?? "Failed to rotate credential", "error");
    }
  }, [toast, fetchCredentials]);

  const typeOptions = useMemo(
    () => CREDENTIAL_TYPES.map((t) => ({ value: t, label: capitalize(t.replace(/_/g, " ")) })),
    []
  );

  if (!isAdmin) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admins can view the credentials vault."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
          <Key size={20} className="text-[var(--color-primary)]" />
          Credentials Vault ({credentials.length})
        </h3>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus size={14} className="mr-1" /> Add Credential
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Label *"
                placeholder="e.g. Stripe API Key"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
              <SelectField
                label="Type"
                options={typeOptions}
                value={form.credentialType}
                onChange={(e) => setForm((f) => ({ ...f, credentialType: e.target.value as CredentialType }))}
              />
            </div>
            <Input
              label="Value *"
              placeholder="The secret value"
              type="password"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Username (optional)"
                placeholder="Associated username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
              <Input
                label="URL (optional)"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <Input
              label="Expires At (optional)"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
            <Textarea
              label="Notes (optional)"
              placeholder="Additional context..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? "Encrypting..." : "Save Credential"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {credentials.length === 0 && !showAddForm && (
        <EmptyState
          title="No credentials stored"
          description="Securely store API keys, passwords, and tokens for this client."
          action={
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus size={14} className="mr-1" /> Add Credential
            </Button>
          }
        />
      )}

      {/* Credentials list */}
      {credentials.map((cred) => (
        <Card key={cred.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[var(--color-primary)]">
                  {TYPE_ICONS[cred.credential_type] ?? "KEY"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-[var(--color-text)]">{cred.label}</h4>
                  <Badge variant="neutral">{capitalize(cred.credential_type.replace(/_/g, " "))}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-[var(--color-text-secondary)] bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded">
                    {revealedIds[cred.id] ?? cred.masked_value}
                  </code>
                  <button
                    onClick={() => handleReveal(cred.id)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
                    title={revealedIds[cred.id] ? "Hide" : "Reveal"}
                  >
                    {revealedIds[cred.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => handleCopy(cred.id)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === cred.id ? <CheckCircle2 size={14} className="text-[var(--status-active)]" /> : <Copy size={14} />}
                  </button>
                </div>
                {cred.username && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">User: {cred.username}</p>
                )}
                {cred.url && (
                  <p className="text-xs text-[var(--color-text-secondary)]">URL: {cred.url}</p>
                )}
                {cred.notes && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{cred.notes}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-secondary)]">
                  <span>Added {formatDate(cred.created_at)}</span>
                  {cred.last_rotated_at && (
                    <span className="flex items-center gap-1">
                      <RotateCw size={10} /> Rotated {formatDate(cred.last_rotated_at)}
                    </span>
                  )}
                  {cred.expires_at && (
                    <span className={new Date(cred.expires_at) < new Date() ? "text-[var(--status-danger)]" : ""}>
                      Expires {formatDate(cred.expires_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRotate(cred)}
              className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
              title="Rotate credential"
            >
              <RotateCw size={14} />
            </button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(cred)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
