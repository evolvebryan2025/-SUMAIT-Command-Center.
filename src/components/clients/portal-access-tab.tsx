"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Send, RefreshCw, Shield, ShieldOff, Clock, Copy } from "lucide-react";
import type { Client } from "@/lib/types";

interface PortalAccessTabProps {
  client: Client;
}

interface PortalAccessData {
  id: string;
  user_id: string;
  client_id: string;
  invited_at: string;
  last_accessed: string | null;
  is_active: boolean;
}

export function PortalAccessTab({ client }: PortalAccessTabProps) {
  const [access, setAccess] = useState<PortalAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState(client.email || "");
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccess();
  }, [client.id]);

  async function fetchAccess() {
    setLoading(true);
    const res = await fetch(`/api/portal/access?client_id=${client.id}`);
    const data = await res.json();
    setAccess(data.access);
    setLoading(false);
  }

  async function handleInvite() {
    setInviting(true);
    setError(null);
    setMagicLink(null);

    const res = await fetch("/api/portal/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: client.id, email: email.trim() }),
    });

    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setMagicLink(data.magic_link);
      await fetchAccess();
    }
    setInviting(false);
  }

  async function handleToggleAccess() {
    if (!access) return;
    const res = await fetch("/api/portal/access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: client.id, is_active: !access.is_active }),
    });
    const data = await res.json();
    if (data.access) setAccess(data.access);
  }

  async function copyLink() {
    if (magicLink) {
      await navigator.clipboard.writeText(magicLink);
    }
  }

  if (loading) {
    return <div className="p-6 animate-pulse h-32 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]" />;
  }

  return (
    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Portal Access</h3>
        {access && (
          <Badge variant={access.is_active ? "active" : "danger"}>
            {access.is_active ? "Active" : "Revoked"}
          </Badge>
        )}
      </div>

      {access ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Clock size={14} />
            <span>
              Invited: {new Date(access.invited_at).toLocaleDateString()}
              {access.last_accessed && (
                <> | Last accessed: {new Date(access.last_accessed).toLocaleDateString()}</>
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleToggleAccess}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer"
            >
              {access.is_active ? <ShieldOff size={14} /> : <Shield size={14} />}
              {access.is_active ? "Revoke Access" : "Reactivate"}
            </button>

            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={inviting ? "animate-spin" : ""} />
              Regenerate Link
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No portal access configured. Send a magic link to give this client access.
          </p>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Client email"
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !email.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              {inviting ? "Sending..." : "Invite to Portal"}
            </button>
          </div>
        </div>
      )}

      {magicLink && (
        <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Magic link (expires in 7 days):</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs text-[var(--color-text)] break-all bg-[rgba(0,0,0,0.3)] p-2 rounded">
              {magicLink}
            </code>
            <button
              onClick={copyLink}
              className="flex items-center gap-1 px-2 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
