"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DevKitForm } from "@/components/dev-kits/dev-kit-form";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import type { DevKit } from "@/lib/types";

export default function EditDevKitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [devKit, setDevKit] = useState<DevKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("dev_kits").select("*").eq("id", id).single().then(({ data }) => {
      setDevKit(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-[var(--radius)]" />;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/settings/dev-kits">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Edit: {devKit?.name}
        </h1>
      </div>

      {devKit && <DevKitForm devKit={devKit} />}
    </div>
  );
}
