"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles, Globe, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { Client } from "@/lib/types";

interface GenerateDevKitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: () => void;
}

interface ExtractedBrand {
  name: string;
  description: string;
  color_primary: string;
  color_accent: string;
  color_background: string;
  color_surface: string;
  color_text: string;
  font_heading: string;
  font_body: string;
}

type Step = "input" | "generating" | "preview" | "error";

export function GenerateDevKitDialog({
  open,
  onOpenChange,
  onGenerated,
}: GenerateDevKitDialogProps) {
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [step, setStep] = useState<Step>("input");
  const [extracted, setExtracted] = useState<ExtractedBrand | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("input");
    setUrl("");
    setClientId("");
    setExtracted(null);
    setErrorMsg("");

    const supabase = createClient();
    supabase
      .from("clients")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setClients(data);
      });
  }, [open]);

  const clientOptions = useMemo(
    () => [
      { value: "", label: "No client association" },
      ...clients.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clients]
  );

  const handleGenerate = useCallback(async () => {
    if (!url.trim()) return;

    setStep("generating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/dev-kits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          clientId: clientId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Generation failed");
        setStep("error");
        return;
      }

      setExtracted(data.extracted);
      setStep("preview");
      toast("Dev kit generated successfully!", "success");
      onGenerated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setStep("error");
    }
  }, [url, clientId, toast, onGenerated]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold font-[var(--font-heading)] text-[var(--color-text)] flex items-center gap-2">
              <Sparkles size={20} className="text-[var(--color-primary)]" />
              AI Dev Kit Generator
            </Dialog.Title>
            <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer">
              <X size={20} />
            </Dialog.Close>
          </div>

          {/* Step: Input */}
          {step === "input" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Enter a website URL and Claude will analyze the design to extract brand colors, fonts, and identity into a new dev kit.
              </p>

              <div className="flex items-center gap-2">
                <Globe size={16} className="text-[var(--color-text-secondary)]" />
                <Input
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
              </div>

              <SelectField
                label="Associate with client (optional)"
                options={clientOptions}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleGenerate} disabled={!url.trim()}>
                  <Sparkles size={14} className="mr-1" />
                  Generate Dev Kit
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Step: Generating */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 size={32} className="text-[var(--color-primary)] animate-spin" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Fetching website and analyzing brand identity...
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                This may take 10-15 seconds
              </p>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && extracted && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--status-active)]">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">Dev kit created!</span>
              </div>

              <div className="p-4 rounded-[var(--radius)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] space-y-3">
                <div>
                  <span className="text-xs text-[var(--color-text-secondary)]">Name</span>
                  <p className="text-sm font-medium text-[var(--color-text)]">{extracted.name}</p>
                </div>
                {extracted.description && (
                  <div>
                    <span className="text-xs text-[var(--color-text-secondary)]">Description</span>
                    <p className="text-sm text-[var(--color-text)]">{extracted.description}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-[var(--color-text-secondary)] block mb-1.5">Colors</span>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Primary", color: extracted.color_primary },
                      { label: "Accent", color: extracted.color_accent },
                      { label: "BG", color: extracted.color_background },
                      { label: "Surface", color: extracted.color_surface },
                      { label: "Text", color: extracted.color_text },
                    ].map((c) => (
                      <div key={c.label} className="flex flex-col items-center gap-1">
                        <div
                          className="w-8 h-8 rounded-md border border-[var(--color-border)]"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-[10px] text-[var(--color-text-secondary)]">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-[var(--color-text-secondary)]">Heading Font</span>
                    <p className="text-sm text-[var(--color-text)]">{extracted.font_heading}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--color-text-secondary)]">Body Font</span>
                    <p className="text-sm text-[var(--color-text)]">{extracted.font_body}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={() => onOpenChange(false)}>Done</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("input");
                    setExtracted(null);
                  }}
                >
                  Generate Another
                </Button>
              </div>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="p-4 rounded-[var(--radius)] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
                <p className="text-sm text-[var(--status-danger)]">{errorMsg}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => setStep("input")}>Try Again</Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
