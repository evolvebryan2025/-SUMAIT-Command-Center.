"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientTabs } from "@/components/clients/client-tabs";

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  return (
    <div className="space-y-6">
      <Link href="/clients">
        <Button variant="ghost" size="sm">
          &larr; Back to Clients
        </Button>
      </Link>
      <ClientTabs clientId={id} />
    </div>
  );
}
