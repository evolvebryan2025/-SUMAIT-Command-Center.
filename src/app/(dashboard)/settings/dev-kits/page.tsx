"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DevKitGrid } from "@/components/dev-kits/dev-kit-grid";
import { GenerateDevKitDialog } from "@/components/dev-kits/generate-dev-kit-dialog";
import { useUser } from "@/hooks/use-user";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function DevKitsPage() {
  const { isAdmin } = useUser();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGenerated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
            Dev Kits
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Manage brand themes for the command center.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setGenerateOpen(true)}>
              <Sparkles size={16} className="mr-1" />
              AI Generate
            </Button>
            <Link href="/settings/dev-kits/new">
              <Button>Add Dev Kit</Button>
            </Link>
          </div>
        )}
      </div>

      <DevKitGrid key={refreshKey} />

      <GenerateDevKitDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerated={handleGenerated}
      />
    </div>
  );
}
