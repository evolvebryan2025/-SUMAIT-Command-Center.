"use client";

import { useEffect, useState } from "react";
import { ListTodo, FolderOpen, Bell } from "lucide-react";
import { usePortalBranding } from "@/hooks/use-portal-branding";
import { PortalTaskList, type PortalTask } from "@/components/portal/portal-task-list";
import { PortalResources } from "@/components/portal/portal-resources";
import { PortalUpdates } from "@/components/portal/portal-updates";
import { Skeleton } from "@/components/ui/skeleton";

type TabKey = "tasks" | "resources" | "updates";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "tasks", label: "Tasks", icon: <ListTodo size={16} /> },
  { key: "resources", label: "Resources", icon: <FolderOpen size={16} /> },
  { key: "updates", label: "Updates", icon: <Bell size={16} /> },
];

export default function PortalDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const { branding } = usePortalBranding();

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/portal/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
      setLoadingTasks(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{
            color: branding.text_color,
            fontFamily: branding.font_heading,
          }}
        >
          Your Projects
        </h1>
        <p
          className="text-sm mt-1 opacity-50"
          style={{ color: branding.text_color }}
        >
          Track progress, view deliverables, and stay up to date.
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer relative"
              style={{
                color: isActive
                  ? branding.accent_color
                  : `${branding.text_color}80`,
              }}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                  style={{ backgroundColor: branding.accent_color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "tasks" && (
        loadingTasks ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-72" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <PortalTaskList tasks={tasks} />
        )
      )}

      {activeTab === "resources" && <PortalResources />}

      {activeTab === "updates" && <PortalUpdates />}
    </div>
  );
}
