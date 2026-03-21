"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CLIENT_STATUSES } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Card } from "@/components/ui/card";
import { logActivity } from "@/lib/activity-logger";

interface ClientFormProps {
  client?: Client;
  onSave?: () => void;
}

interface FormData {
  name: string;
  company: string;
  email: string;
  status: string;
  health_score: number;
  notes: string;
  parent_client_id: string;
}

const STATUS_OPTIONS = CLIENT_STATUSES.map((s) => ({
  value: s,
  label: capitalize(s),
}));

export function ClientForm({ client, onSave }: ClientFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = Boolean(client);

  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select("id, name")
      .is("parent_client_id", null)
      .order("name")
      .then(({ data }) => {
        const opts = (data ?? [])
          .filter((c) => c.id !== client?.id)
          .map((c) => ({ value: c.id, label: c.name }));
        setParentOptions([{ value: "", label: "None (direct client)" }, ...opts]);
      });
  }, [client?.id]);

  const [form, setForm] = useState<FormData>({
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    status: client?.status ?? "active",
    health_score: client?.health_score ?? 100,
    notes: client?.notes ?? "",
    parent_client_id: client?.parent_client_id ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

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
      next.name = "Name is required.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Invalid email address.";
    }
    if (form.health_score < 0 || form.health_score > 100) {
      next.health_score = "Must be between 0 and 100.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setSaving(true);
      const supabase = createClient();

      const payload = {
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        status: form.status,
        health_score: form.health_score,
        notes: form.notes.trim() || null,
        parent_client_id: form.parent_client_id || null,
      };

      if (isEditing && client) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", client.id);

        if (error) {
          toast(error.message, "error");
          setSaving(false);
          return;
        }
        await logActivity(supabase, "updated", "client", client.id, { name: payload.name });
        toast("Client updated successfully.", "success");
      } else {
        const { data: inserted, error } = await supabase
          .from("clients")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          toast(error.message, "error");
          setSaving(false);
          return;
        }
        await logActivity(supabase, "created", "client", inserted?.id ?? null, { name: payload.name });
        toast("Client created successfully.", "success");
      }

      setSaving(false);

      if (onSave) {
        onSave();
      } else {
        router.push("/clients");
      }
    },
    [form, validate, isEditing, client, toast, onSave, router]
  );

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name *"
          placeholder="Client name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          error={errors.name}
        />

        <Input
          label="Company"
          placeholder="Company name"
          value={form.company}
          onChange={(e) => updateField("company", e.target.value)}
          error={errors.company}
        />

        <Input
          label="Email"
          type="email"
          placeholder="client@example.com"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          error={errors.email}
        />

        <SelectField
          label="Parent Client (Sub-client of)"
          options={parentOptions}
          value={form.parent_client_id}
          onChange={(e) => updateField("parent_client_id", e.target.value)}
        />

        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(e) => updateField("status", e.target.value)}
          error={errors.status}
        />

        <Input
          label="Health Score (0-100)"
          type="number"
          min={0}
          max={100}
          value={String(form.health_score)}
          onChange={(e) => updateField("health_score", Number(e.target.value))}
          error={errors.health_score}
        />

        <Textarea
          label="Notes"
          placeholder="Any relevant notes..."
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          error={errors.notes}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Update Client" : "Create Client"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => (onSave ? onSave() : router.push("/clients"))}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
