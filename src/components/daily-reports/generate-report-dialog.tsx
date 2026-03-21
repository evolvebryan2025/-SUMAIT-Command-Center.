"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DevKitOption {
  id: string;
  name: string;
}

interface ProfileOption {
  id: string;
  name: string;
}

interface GeneratedReport {
  id: string;
  title: string;
}

type Scope = "daily" | "weekly";
type Step = "form" | "generating" | "success" | "error";

export function GenerateReportDialog({ open, onOpenChange }: GenerateReportDialogProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("form");
  const [scope, setScope] = useState<Scope>("daily");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateStart, setDateStart] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [devKitId, setDevKitId] = useState("");
  const [userId, setUserId] = useState("");
  const [devKits, setDevKits] = useState<DevKitOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;

    setStep("form");
    setScope("daily");
    setDate(new Date().toISOString().split("T")[0]);
    setDateStart(new Date().toISOString().split("T")[0]);
    setDateEnd(new Date().toISOString().split("T")[0]);
    setDevKitId("");
    setUserId("");
    setGeneratedReport(null);
    setErrorMsg("");

    const supabase = createClient();

    supabase
      .from("dev_kits")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setDevKits(data);
      });

    supabase
      .from("profiles")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setProfiles(data);
      });
  }, [open]);

  const devKitOptions = useMemo(
    () => [
      { value: "", label: "Default theme" },
      ...devKits.map((dk) => ({ value: dk.id, label: dk.name })),
    ],
    [devKits]
  );

  const profileOptions = useMemo(
    () => [
      { value: "", label: "All Team" },
      ...profiles.map((p) => ({ value: p.id, label: p.name })),
    ],
    [profiles]
  );

  const scopeOptions = useMemo(
    () => [
      { value: "daily", label: "Single Day" },
      { value: "weekly", label: "Date Range" },
    ],
    []
  );

  const handleGenerate = useCallback(async () => {
    setStep("generating");
    setErrorMsg("");

    const parameters: Record<string, string> = { scope };

    if (scope === "daily") {
      parameters.date = date;
    } else {
      parameters.dateStart = dateStart;
      parameters.dateEnd = dateEnd;
    }

    if (userId) {
      parameters.userId = userId;
    }

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "delegation_daily",
          parameters,
          devKitId: devKitId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Report generation failed");
        setStep("error");
        return;
      }

      setGeneratedReport({ id: data.id, title: data.title });
      setStep("success");
      toast("Delegation report generated!", "success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setStep("error");
    }
  }, [scope, date, dateStart, dateEnd, userId, devKitId, toast]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold font-[var(--font-heading)] text-[var(--color-text)] flex items-center gap-2">
              <FileText size={20} className="text-[var(--color-primary)]" />
              Generate Delegation Report
            </Dialog.Title>
            <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer">
              <X size={20} />
            </Dialog.Close>
          </div>

          {step === "form" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Generate a branded HTML report from daily builder submissions. Choose a date range and optionally filter by team member.
              </p>

              <SelectField
                label="Report scope"
                options={scopeOptions}
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
              />

              {scope === "daily" ? (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Start date</label>
                    <Input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">End date</label>
                    <Input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <SelectField
                label="Dev Kit (theme)"
                options={devKitOptions}
                value={devKitId}
                onChange={(e) => setDevKitId(e.target.value)}
              />

              <SelectField
                label="Builder"
                options={profileOptions}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleGenerate}>
                  <FileText size={14} className="mr-1" />
                  Generate
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 size={32} className="text-[var(--color-primary)] animate-spin" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Fetching daily reports and generating HTML...
              </p>
            </div>
          )}

          {step === "success" && generatedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--status-active)]">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">Report generated!</span>
              </div>

              <div className="p-4 rounded-[var(--radius)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] space-y-2">
                <div>
                  <span className="text-xs text-[var(--color-text-secondary)]">Title</span>
                  <p className="text-sm font-medium text-[var(--color-text)]">{generatedReport.title}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-secondary)]">Report ID</span>
                  <p className="text-xs font-mono text-[var(--color-text)]">{generatedReport.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <a href={`/daily-report/${generatedReport.id}/edit`}>
                  <Button>Open Report</Button>
                </a>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="space-y-4">
              <div className="p-4 rounded-[var(--radius)] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
                <p className="text-sm text-[var(--status-danger)]">{errorMsg}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => setStep("form")}>Try Again</Button>
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
