"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Plus, Star, Trash2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

export interface InstantlyAccount {
  id: string;
  name: string;
  email: string | null;
  is_default: boolean;
}

interface AccountSelectorProps {
  selectedAccountId: string | null;
  onAccountChange: (accountId: string | null) => void;
}

export function AccountSelector({ selectedAccountId, onAccountChange }: AccountSelectorProps) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<InstantlyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/instantly-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        // Auto-select default account if nothing selected
        if (!selectedAccountId && data.length > 0) {
          const defaultAcc = data.find((a: InstantlyAccount) => a.is_default);
          if (defaultAcc) {
            onAccountChange(defaultAcc.id);
          }
        }
      }
    } catch {
      // Silently fail — env var fallback will be used
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, onAccountChange]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || !newApiKey.trim()) {
      toast("Name and API key are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/instantly-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          api_key: newApiKey.trim(),
          email: newEmail.trim() || null,
          is_default: accounts.length === 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to add account" }));
        throw new Error(err.error);
      }
      const created = await res.json();
      toast("Instantly account added.", "success");
      setDialogOpen(false);
      setNewName("");
      setNewApiKey("");
      setNewEmail("");
      await fetchAccounts();
      onAccountChange(created.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add account", "error");
    } finally {
      setSaving(false);
    }
  }, [newName, newApiKey, newEmail, accounts.length, toast, fetchAccounts, onAccountChange]);

  const handleSetDefault = useCallback(async (accountId: string) => {
    try {
      await fetch(`/api/settings/instantly-accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      toast("Default account updated.", "success");
      fetchAccounts();
    } catch {
      toast("Failed to update default.", "error");
    }
  }, [toast, fetchAccounts]);

  const handleDelete = useCallback(async (accountId: string, name: string) => {
    if (!confirm(`Remove "${name}" from Instantly accounts?`)) return;
    try {
      await fetch(`/api/settings/instantly-accounts/${accountId}`, { method: "DELETE" });
      toast("Account removed.", "success");
      if (selectedAccountId === accountId) {
        onAccountChange(null);
      }
      fetchAccounts();
    } catch {
      toast("Failed to remove account.", "error");
    }
  }, [selectedAccountId, onAccountChange, toast, fetchAccounts]);

  // If no accounts configured, show "Add Account" button
  if (!loading && accounts.length === 0) {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus size={14} />
          Add Instantly Account
        </Button>
        <AddAccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          newName={newName}
          setNewName={setNewName}
          newApiKey={newApiKey}
          setNewApiKey={setNewApiKey}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          saving={saving}
          onSave={handleAdd}
        />
      </>
    );
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const displayLabel = selectedAccount
    ? selectedAccount.name
    : accounts.length > 0
      ? "All Accounts"
      : "Loading...";

  return (
    <>
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
          >
            <span className="truncate max-w-[180px]">{displayLabel}</span>
            <ChevronDown size={14} className="text-[var(--color-text-secondary)]" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="w-72 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl z-50 p-1"
          >
            {/* "All Accounts" option */}
            <button
              type="button"
              onClick={() => { onAccountChange(null); setPopoverOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                !selectedAccountId
                  ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]"
              )}
            >
              All Accounts
            </button>

            {/* Account list */}
            {accounts.map((account) => (
              <div
                key={account.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group",
                  selectedAccountId === account.id
                    ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]"
                )}
              >
                <button
                  type="button"
                  className="flex-1 text-left truncate cursor-pointer"
                  onClick={() => { onAccountChange(account.id); setPopoverOpen(false); }}
                >
                  {account.name}
                  {account.email && (
                    <span className="text-xs text-[var(--color-text-secondary)] ml-1">
                      ({account.email})
                    </span>
                  )}
                </button>
                {account.is_default && (
                  <Star size={12} className="text-yellow-500 shrink-0" fill="currentColor" />
                )}
                {!account.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(account.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-secondary)] hover:text-yellow-500 transition-all cursor-pointer"
                    title="Set as default"
                  >
                    <Star size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(account.id, account.name)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-secondary)] hover:text-red-400 transition-all cursor-pointer"
                  title="Remove account"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Add account */}
            <div className="border-t border-[var(--color-border)] mt-1 pt-1">
              <button
                type="button"
                onClick={() => { setDialogOpen(true); setPopoverOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add Account
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <AddAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        newName={newName}
        setNewName={setNewName}
        newApiKey={newApiKey}
        setNewApiKey={setNewApiKey}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        saving={saving}
        onSave={handleAdd}
      />
    </>
  );
}

function AddAccountDialog({
  open,
  onOpenChange,
  newName,
  setNewName,
  newApiKey,
  setNewApiKey,
  newEmail,
  setNewEmail,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  newName: string;
  setNewName: (v: string) => void;
  newApiKey: string;
  setNewApiKey: (v: string) => void;
  newEmail: string;
  setNewEmail: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 z-50 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Add Instantly Account
          </Dialog.Title>
          <div className="space-y-4">
            <Input
              label="Account Name *"
              placeholder="e.g. Main Outreach"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              label="API Key *"
              placeholder="Your Instantly API key"
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
            />
            <Input
              label="Email (optional)"
              placeholder="e.g. outreach@company.com"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <p className="text-xs text-[var(--color-text-secondary)]">
              The API key will be validated against Instantly before saving.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Validating..." : "Add Account"}
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
