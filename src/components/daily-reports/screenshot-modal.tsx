"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

interface ScreenshotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storagePath: string;
}

export function ScreenshotModal({ open, onOpenChange, storagePath }: ScreenshotModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !storagePath) {
      setImageUrl(null);
      setError(null);
      return;
    }

    async function loadImage() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: signError } = await supabase.storage
        .from("daily-reports")
        .createSignedUrl(storagePath, 3600);

      if (signError || !data?.signedUrl) {
        setError(signError?.message ?? "Failed to load image");
        setLoading(false);
        return;
      }

      setImageUrl(data.signedUrl);
      setLoading(false);
    }

    loadImage();
  }, [open, storagePath]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] p-4 shadow-xl">
          <Dialog.Title className="sr-only">Screenshot Preview</Dialog.Title>

          <Dialog.Close className="absolute right-3 top-3 p-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer z-10">
            <X size={20} />
          </Dialog.Close>

          <div className="flex items-center justify-center min-h-[300px]">
            {loading && <Skeleton className="w-full h-[400px] rounded-lg" />}

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            {imageUrl && !loading && (
              <img
                src={imageUrl}
                alt="Screenshot"
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
