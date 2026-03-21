"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_VARIANTS } from "@/lib/constants";
import { capitalize, formatDate } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactForm } from "@/components/contacts/contact-form";
import { ContactTaskList } from "@/components/contacts/contact-task-list";
import type { ClientContact } from "@/lib/types";

interface ContactDetailProps {
  contactId: string;
  clientId: string;
}

export function ContactDetail({ contactId, clientId }: ContactDetailProps) {
  const { toast } = useToast();
  const [contact, setContact] = useState<ClientContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("id", contactId)
        .single();
      if (error) throw error;
      setContact(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load contact";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  function handleSave() {
    setEditing(false);
    fetchContact();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <Card>
        <p className="text-[var(--color-text-secondary)]">Contact not found.</p>
      </Card>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        <ContactForm clientId={clientId} contact={contact} onSave={handleSave} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{contact.name}</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--color-text-secondary)]">Company</span>
            <p className="text-[var(--color-text)]">{contact.company ?? "-"}</p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Email</span>
            <p className="text-[var(--color-text)]">{contact.email ?? "-"}</p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Status</span>
            <p className="mt-1">
              <Badge variant={STATUS_VARIANTS[contact.status]}>{capitalize(contact.status)}</Badge>
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Created</span>
            <p className="text-[var(--color-text)]">{formatDate(contact.created_at)}</p>
          </div>
          {contact.notes && (
            <div className="sm:col-span-2">
              <span className="text-[var(--color-text-secondary)]">Notes</span>
              <p className="text-[var(--color-text)] whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </div>
      </Card>

      <ContactTaskList contactId={contactId} clientId={clientId} />
    </div>
  );
}
