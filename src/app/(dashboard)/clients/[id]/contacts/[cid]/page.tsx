"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContactDetail } from "@/components/contacts/contact-detail";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const { id, cid } = React.use(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${id}`}>
          <Button size="sm" variant="ghost">&larr; Back to Client</Button>
        </Link>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Contact Details
        </h1>
      </div>
      <ContactDetail contactId={cid} clientId={id} />
    </div>
  );
}
