"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            &larr; Back to Clients
          </Button>
        </Link>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          New Client
        </h1>
      </div>
      <ClientForm />
    </div>
  );
}
