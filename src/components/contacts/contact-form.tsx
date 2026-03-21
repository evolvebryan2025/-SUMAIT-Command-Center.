"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_STATUSES, STATUS_VARIANTS } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientContact, ContactStatus } from "@/lib/types";

interface ContactFormProps {
  clientId: string;
  contact?: ClientContact;
  onSave?: () => void;
}

interface FormData {
  name: string;
  company: string;
  email: string;
  status: ContactStatus;
  notes: string;
}

export function ContactForm({ clientId, contact, onSave }: ContactFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [form, setForm] = useState<FormData>({
    name: contact?.name ?? "",
    company: contact?.company ?? "",
    email: contact?.email ?? "",
    status: contact?.status ?? "prospect",
    notes: contact?.notes ?? "",
  });

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) {
      next.name = "Name is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Invalid email address";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        client_id: clientId,
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (contact) {
        const { error } = await supabase
          .from("client_contacts")
          .update(payload)
          .eq("id", contact.id);
        if (error) throw error;
        toast("Contact updated", "success");
      } else {
        const { error } = await supabase
          .from("client_contacts")
          .insert(payload);
        if (error) throw error;
        toast("Contact created", "success");
      }

      onSave?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save contact";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = CONTACT_STATUSES.map((s) => ({
    value: s,
    label: capitalize(s),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contact ? "Edit Contact" : "New Contact"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="Contact name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          error={errors.name}
          required
        />
        <Input
          label="Company"
          placeholder="Company name"
          value={form.company}
          onChange={(e) => updateField("company", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          placeholder="email@example.com"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          error={errors.email}
        />
        <SelectField
          label="Status"
          options={statusOptions}
          value={form.status}
          onChange={(e) => updateField("status", e.target.value as ContactStatus)}
        />
        <Textarea
          label="Notes"
          placeholder="Additional notes..."
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : contact ? "Update Contact" : "Create Contact"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
