"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  accountId?: string | null;
}

interface FormData {
  name: string;
  subject: string;
  from_email: string;
  schedule: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  subject: "",
  from_email: "",
  schedule: "",
};

export function CampaignFormDialog({ open, onOpenChange, onSaved, accountId }: CampaignFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM });
      setErrors({});
    }
  }, [open]);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) {
      next.name = "Campaign name is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setSaving(true);
      try {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
        };
        if (accountId) payload.accountId = accountId;
        if (form.subject.trim()) payload.subject = form.subject.trim();
        if (form.from_email.trim()) payload.from_email = form.from_email.trim();
        if (form.schedule.trim()) payload.schedule = form.schedule.trim();

        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Failed to create campaign" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        toast("Campaign created successfully.", "success");
        onOpenChange(false);
        onSaved();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create campaign";
        toast(message, "error");
      } finally {
        setSaving(false);
      }
    },
    [form, validate, toast, onOpenChange, onSaved]
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold font-[var(--font-heading)] text-[var(--color-text)]">
              New Campaign
            </Dialog.Title>
            <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer">
              <X size={20} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Campaign Name *"
              placeholder="e.g. Q1 Outreach"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              error={errors.name}
            />

            <Input
              label="Subject Line"
              placeholder="e.g. Quick question about {{company}}"
              value={form.subject}
              onChange={(e) => updateField("subject", e.target.value)}
              error={errors.subject}
            />

            <Input
              label="From Email"
              placeholder="e.g. bryan@sumait.com"
              type="email"
              value={form.from_email}
              onChange={(e) => updateField("from_email", e.target.value)}
              error={errors.from_email}
            />

            <Input
              label="Schedule"
              placeholder="e.g. Mon-Fri 9am-5pm EST"
              value={form.schedule}
              onChange={(e) => updateField("schedule", e.target.value)}
              error={errors.schedule}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Campaign"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
