"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/contacts/contact-form";

export default function NewContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${id}`}>
          <Button size="sm" variant="ghost">&larr; Back to Client</Button>
        </Link>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          New Contact
        </h1>
      </div>
      <ContactForm
        clientId={id}
        onSave={() => router.push(`/clients/${id}`)}
      />
    </div>
  );
}
