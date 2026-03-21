"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { useTheme } from "@/providers/theme-provider";
import type { DevKit } from "@/lib/types";

export function DevKitGrid() {
  const [devKits, setDevKits] = useState<DevKit[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUser();
  const { toast } = useToast();
  const { setActiveKit } = useTheme();

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("dev_kits").select("*").order("is_default", { ascending: false });
    setDevKits(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSetDefault(kit: DevKit) {
    const supabase = createClient();
    await supabase.from("dev_kits").update({ is_default: false }).neq("id", kit.id);
    await supabase.from("dev_kits").update({ is_default: true }).eq("id", kit.id);
    toast("Default dev kit updated", "success");
    load();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("dev_kits").delete().eq("id", id);
    toast("Dev kit deleted", "success");
    load();
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (devKits.length === 0) {
    return <EmptyState title="No dev kits" description="Create your first brand kit." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {devKits.map((kit) => (
        <Card key={kit.id} className="relative">
          {kit.is_default && (
            <Badge variant="active" className="absolute top-3 right-3">Default</Badge>
          )}
          <div className="flex gap-2 mb-4">
            {[kit.color_primary, kit.color_accent, kit.color_background, kit.color_surface, kit.color_text].map((color, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border border-[var(--color-border)]"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">{kit.name}</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            {kit.font_heading} / {kit.font_body}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => setActiveKit(kit)}>Preview</Button>
            {isAdmin && (
              <>
                <Link href={`/settings/dev-kits/${kit.id}`}>
                  <Button size="sm" variant="secondary">Edit</Button>
                </Link>
                {!kit.is_default && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => handleSetDefault(kit)}>Set Default</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(kit.id)}>Delete</Button>
                  </>
                )}
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
