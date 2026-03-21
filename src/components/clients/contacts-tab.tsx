"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_STATUSES, STATUS_VARIANTS } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import type { ClientContact } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ContactsTabProps {
  clientId: string;
}

interface ContactFormData {
  name: string;
  company: string;
  email: string;
  status: string;
  notes: string;
}

const STATUS_OPTIONS = CONTACT_STATUSES.map((s) => ({
  value: s,
  label: capitalize(s),
}));

const EMPTY_FORM: ContactFormData = {
  name: "",
  company: "",
  email: "",
  status: "active",
  notes: "",
};

export function ContactsTab({ clientId }: ContactsTabProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_contacts")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast(error.message, "error");
    } else {
      setContacts(data ?? []);
    }
    setLoading(false);
  }, [clientId, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const updateField = useCallback(
    <K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast("Contact name is required.", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      client_id: clientId,
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    const { error } = await supabase.from("client_contacts").insert(payload);

    if (error) {
      toast(error.message, "error");
      setSaving(false);
      return;
    }

    toast("Contact added.", "success");
    setSaving(false);
    cancelForm();
    fetchContacts();
  }, [form, clientId, toast, cancelForm, fetchContacts]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">
          Contacts ({contacts.length})
        </h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Add Contact
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <Card>
          <div className="space-y-4">
            <Input
              label="Name *"
              placeholder="Contact name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              />
            </div>
            <SelectField
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
            />
            <Textarea
              label="Notes"
              placeholder="Any notes about this contact..."
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Add Contact"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {contacts.length === 0 && !showForm && (
        <EmptyState
          title="No contacts yet"
          description="Add contacts to track this client's own customers."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              Add Contact
            </Button>
          }
        />
      )}

      {/* Contact grid */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/clients/${clientId}/contacts/${contact.id}`}
            >
              <Card className="hover:border-[var(--color-primary)] transition-colors cursor-pointer h-full">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-[var(--color-text)] truncate">
                    {contact.name}
                  </h4>
                  <Badge variant={STATUS_VARIANTS[contact.status] ?? "neutral"}>
                    {capitalize(contact.status)}
                  </Badge>
                </div>
                {contact.company && (
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">
                    {contact.company}
                  </p>
                )}
                {contact.email && (
                  <p className="text-xs text-[var(--color-text-secondary)] truncate mt-1">
                    {contact.email}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
