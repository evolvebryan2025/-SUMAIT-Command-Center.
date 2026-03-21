"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DevKitForm } from "@/components/dev-kits/dev-kit-form";
import { ArrowLeft } from "lucide-react";

export default function NewDevKitPage() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/settings/dev-kits">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          New Dev Kit
        </h1>
      </div>

      <DevKitForm />
    </div>
  );
}
