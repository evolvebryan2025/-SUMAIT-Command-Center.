"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_VARIANTS,
  STATUS_VARIANTS,
} from "@/lib/constants";
import { capitalize, formatDate } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import type { Project } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ProjectsTabProps {
  clientId: string;
}

interface ProjectFormData {
  name: string;
  description: string;
  status: string;
  type: string;
  due_date: string;
  deliverable_url: string;
}

const STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({
  value: s,
  label: capitalize(s),
}));

const TYPE_OPTIONS = PROJECT_TYPES.map((t) => ({
  value: t,
  label: PROJECT_TYPE_LABELS[t],
}));

const EMPTY_FORM: ProjectFormData = {
  name: "",
  description: "",
  status: "planned",
  type: "deliverable",
  due_date: "",
  deliverable_url: "",
};

export function ProjectsTab({ clientId }: ProjectsTabProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast(error.message, "error");
    } else {
      setProjects(data ?? []);
    }
    setLoading(false);
  }, [clientId, toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(
    () =>
      typeFilter === "all"
        ? projects
        : projects.filter((p) => p.type === typeFilter),
    [projects, typeFilter]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.type] = (counts[p.type] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  const updateField = useCallback(
    <K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const openAddForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((project: Project) => {
    setForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      type: project.type ?? "deliverable",
      due_date: project.due_date ?? "",
      deliverable_url: project.deliverable_url ?? "",
    });
    setEditingId(project.id);
    setShowForm(true);
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast("Project name is required.", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      client_id: clientId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      type: form.type,
      due_date: form.due_date || null,
      deliverable_url: form.deliverable_url.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast(error.message, "error");
        setSaving(false);
        return;
      }
      toast("Project updated.", "success");
    } else {
      const { error } = await supabase.from("projects").insert(payload);

      if (error) {
        toast(error.message, "error");
        setSaving(false);
        return;
      }
      toast("Project created.", "success");
    }

    setSaving(false);
    cancelForm();
    fetchProjects();
  }, [form, editingId, clientId, toast, cancelForm, fetchProjects]);

  const handleDelete = useCallback(
    async (projectId: string) => {
      if (!confirm("Delete this project? This cannot be undone.")) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        toast(error.message, "error");
        return;
      }
      toast("Project deleted.", "success");
      fetchProjects();
    },
    [toast, fetchProjects]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">
          Projects ({projects.length})
        </h3>
        {!showForm && (
          <Button size="sm" onClick={openAddForm}>
            Add Project
          </Button>
        )}
      </div>

      {/* Type filter pills */}
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === "all"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            }`}
          >
            All ({projects.length})
          </button>
          {PROJECT_TYPES.filter((t) => typeCounts[t]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
            >
              {PROJECT_TYPE_LABELS[t]} ({typeCounts[t]})
            </button>
          ))}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <Card>
          <div className="space-y-4">
            <Input
              label="Project Name *"
              placeholder="Project name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <Textarea
              label="Description"
              placeholder="Brief description..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField
                label="Type"
                options={TYPE_OPTIONS}
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
              />
              <SelectField
                label="Status"
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              />
              <Input
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => updateField("due_date", e.target.value)}
              />
            </div>
            <Input
              label="Deliverable URL"
              placeholder="https://..."
              value={form.deliverable_url}
              onChange={(e) => updateField("deliverable_url", e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Project list */}
      {filteredProjects.length === 0 && !showForm && (
        <EmptyState
          title={typeFilter === "all" ? "No projects yet" : `No ${PROJECT_TYPE_LABELS[typeFilter]?.toLowerCase() ?? typeFilter} projects`}
          description={typeFilter === "all" ? "Add a project to start tracking deliverables." : "Try a different filter or add a new project."}
          action={
            typeFilter === "all" ? (
              <Button size="sm" onClick={openAddForm}>
                Add Project
              </Button>
            ) : undefined
          }
        />
      )}

      {filteredProjects.map((project) => (
        <Card key={project.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-medium text-[var(--color-text)] truncate">
                  {project.name}
                </h4>
                <Badge variant={PROJECT_TYPE_VARIANTS[project.type] ?? "neutral"}>
                  {PROJECT_TYPE_LABELS[project.type] ?? capitalize(project.type)}
                </Badge>
                <Badge variant={STATUS_VARIANTS[project.status] ?? "neutral"}>
                  {capitalize(project.status)}
                </Badge>
              </div>
              {project.description && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                {project.due_date && (
                  <span>Due: {formatDate(project.due_date)}</span>
                )}
                {project.deliverable_url && (
                  <a
                    href={project.deliverable_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-primary)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Deliverable
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => openEditForm(project)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(project.id)}>
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
