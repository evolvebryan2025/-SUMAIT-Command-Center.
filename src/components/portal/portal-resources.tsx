"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FolderOpen } from "lucide-react";
import { usePortalBranding } from "@/hooks/use-portal-branding";
import { PROJECT_TYPE_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface PortalProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  type: string;
  deliverable_url: string | null;
  due_date: string | null;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  deliverable: "#22c55e",
  presentation: "#3b82f6",
  tool: "#eab308",
  report: "#6b7280",
  brand_kit: "#8b5cf6",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PortalResources() {
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { branding } = usePortalBranding();

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/portal/resources");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FolderOpen
          size={40}
          className="mb-4 opacity-30"
          style={{ color: branding.text_color }}
        />
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: branding.text_color }}
        >
          No resources yet
        </h3>
        <p
          className="text-sm opacity-50"
          style={{ color: branding.text_color }}
        >
          Delivered projects and resources will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {projects.map((project) => {
        const typeColor = TYPE_COLORS[project.type] ?? "#6b7280";
        const typeLabel = PROJECT_TYPE_LABELS[project.type] ?? project.type;

        return (
          <div
            key={project.id}
            className="rounded-lg border p-4 space-y-3"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: branding.text_color }}
              >
                {project.name}
              </h3>
              <span
                className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                style={{
                  backgroundColor: `${typeColor}15`,
                  borderColor: `${typeColor}30`,
                  color: typeColor,
                }}
              >
                {typeLabel}
              </span>
            </div>

            {project.description && (
              <p
                className="text-xs line-clamp-2"
                style={{ color: branding.text_color, opacity: 0.6 }}
              >
                {project.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span
                className="text-[10px] opacity-40"
                style={{ color: branding.text_color }}
              >
                {formatDate(project.created_at)}
              </span>

              {project.deliverable_url && (
                <a
                  href={project.deliverable_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: branding.accent_color }}
                >
                  View <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
