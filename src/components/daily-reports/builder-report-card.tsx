"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, XOctagon, ExternalLink, Image as ImageIcon } from "lucide-react";
import { ScreenshotModal } from "./screenshot-modal";
import type { DailyReport, DailyReportItem, DailyReportAttachment } from "@/lib/types";

interface BuilderReportCardProps {
  report: DailyReport | null;
  builderName: string;
  avatarUrl: string | null;
}

const SECTION_CONFIG = {
  completed: {
    label: "Completed",
    icon: CheckCircle,
    badgeVariant: "active" as const,
    color: "#22c55e",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    badgeVariant: "warning" as const,
    color: "#eab308",
  },
  blocker: {
    label: "Blockers",
    icon: XOctagon,
    badgeVariant: "danger" as const,
    color: "#ef4444",
  },
} as const;

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function groupItems(items: DailyReportItem[]): Record<string, DailyReportItem[]> {
  const grouped: Record<string, DailyReportItem[]> = {
    completed: [],
    pending: [],
    blocker: [],
  };
  for (const item of items) {
    const key = item.item_type;
    if (grouped[key]) {
      grouped[key] = [...grouped[key], item];
    }
  }
  return grouped;
}

function getScreenshots(items: DailyReportItem[]): DailyReportAttachment[] {
  const screenshots: DailyReportAttachment[] = [];
  for (const item of items) {
    if (item.attachments) {
      for (const att of item.attachments) {
        if (att.file_type.startsWith("image/")) {
          screenshots.push(att);
        }
      }
    }
  }
  return screenshots;
}

function ItemSection({ type, items }: { type: keyof typeof SECTION_CONFIG; items: DailyReportItem[] }) {
  const config = SECTION_CONFIG[type];
  const Icon = config.icon;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: config.color }} />
        <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
          {config.label}
        </span>
        <Badge variant={config.badgeVariant}>{items.length}</Badge>
      </div>
      <ul className="space-y-1.5 pl-5">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-[var(--color-text)]">
            <span>{item.description}</span>
            {item.links && item.links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {item.links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                  >
                    <ExternalLink size={11} />
                    Link {i + 1}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BuilderReportCard({ report, builderName, avatarUrl }: BuilderReportCardProps) {
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);

  if (!report) {
    return (
      <Card className="border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.05)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[rgba(234,179,8,0.2)] flex items-center justify-center text-sm font-semibold text-[#eab308]">
            {getInitial(builderName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">{builderName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle size={12} className="text-[#eab308]" />
              <span className="text-xs text-[#eab308]">Not submitted</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const items = report.items ?? [];
  const grouped = groupItems(items);
  const screenshots = getScreenshots(items);

  return (
    <>
      <Card>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-sm font-semibold text-white">
            {getInitial(builderName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">{builderName}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {new Date(report.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <ItemSection type="completed" items={grouped.completed} />
          <ItemSection type="pending" items={grouped.pending} />
          <ItemSection type="blocker" items={grouped.blocker} />
        </div>

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Screenshots
            </p>
            <div className="flex flex-wrap gap-2">
              {screenshots.map((att) => (
                <button
                  key={att.id}
                  onClick={() => setScreenshotPath(att.storage_path)}
                  className="w-16 h-16 rounded-[var(--radius)] bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                  title={att.file_name}
                >
                  <ImageIcon size={20} className="text-[var(--color-text-secondary)]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Screenshot modal */}
      {screenshotPath && (
        <ScreenshotModal
          open={!!screenshotPath}
          onOpenChange={(open) => {
            if (!open) setScreenshotPath(null);
          }}
          storagePath={screenshotPath}
        />
      )}
    </>
  );
}
