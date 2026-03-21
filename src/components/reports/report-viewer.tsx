"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GeneratedReport } from "@/lib/types";
import { Download, ExternalLink, Rocket, Loader2, Check } from "lucide-react";

interface ReportViewerProps {
  report: GeneratedReport;
}

export function ReportViewer({ report }: ReportViewerProps) {
  const createBlobUrl = useCallback(() => {
    const blob = new Blob([report.html_content || ""], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [report.html_content]);

  const handleDownload = useCallback(() => {
    const url = createBlobUrl();
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^a-zA-Z0-9-_ ]/g, "")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [createBlobUrl, report.title]);

  const handleViewFull = useCallback(() => {
    const url = createBlobUrl();
    window.open(url, "_blank");
  }, [createBlobUrl]);

  const [deployState, setDeployState] = useState<"idle" | "deploying" | "done">("idle");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);

  const handleDeploy = useCallback(async () => {
    setDeployState("deploying");
    try {
      const res = await fetch("/api/reports/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: report.html_content, title: report.title }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Deploy failed");
        setDeployState("idle");
        return;
      }
      setDeployUrl(data.url);
      setDeployState("done");
    } catch {
      alert("Deploy failed — check your connection.");
      setDeployState("idle");
    }
  }, [report.html_content, report.title]);

  if (!report.html_content) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)]">
        No content available for this report.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
          {report.title}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} />
            Download HTML
          </Button>
          {deployState === "done" && deployUrl ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(deployUrl, "_blank")}
              className="text-green-400 border-green-400/30"
            >
              <Check size={14} />
              View Deploy
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDeploy}
              disabled={deployState === "deploying"}
            >
              {deployState === "deploying" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Rocket size={14} />
              )}
              {deployState === "deploying" ? "Deploying..." : "Deploy to Vercel"}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleViewFull}>
            <ExternalLink size={14} />
            View Full
          </Button>
        </div>
      </div>
      <div className="rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
        <iframe
          srcDoc={report.html_content}
          sandbox="allow-same-origin"
          title={report.title}
          className="w-full h-[600px] bg-[#0a0a0a]"
        />
      </div>
    </div>
  );
}
