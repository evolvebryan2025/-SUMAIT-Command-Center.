"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import type { Task, Profile, Client, Project } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSaved: () => void;
}

interface FormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string;
  client_id: string;
  project_id: string;
  due_date: string;
}

export function TaskFormDialog({ open, onOpenChange, task, onSaved }: TaskFormDialogProps) {
  const { toast } = useToast();
  const isEditing = Boolean(task);

  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    assigned_to: "",
    client_id: "",
    project_id: "",
    due_date: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Reset form when dialog opens or task changes
  useEffect(() => {
    if (open) {
      setForm({
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? "pending",
        priority: task?.priority ?? "medium",
        assigned_to: task?.assigned_to ?? "",
        client_id: task?.client_id ?? "",
        project_id: task?.project_id ?? "",
        due_date: task?.due_date ? task.due_date.split("T")[0] : "",
      });
      setErrors({});
    }
  }, [open, task]);

  // Fetch profiles and clients
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();

    async function loadOptions() {
      const [profilesRes, clientsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("is_active", true).order("name").limit(100),
        supabase.from("clients").select("*").order("name").limit(500),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (clientsRes.data) setClientsList(clientsRes.data);
    }

    loadOptions();
  }, [open]);

  // Fetch projects filtered by selected client
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();

    async function loadProjects() {
      if (!form.client_id) {
        setProjects([]);
        return;
      }
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", form.client_id)
        .order("name");
      setProjects(data ?? []);
    }

    loadProjects();
  }, [open, form.client_id]);

  const statusOptions = useMemo(
    () => TASK_STATUSES.map((s) => ({ value: s, label: capitalize(s) })),
    []
  );

  const priorityOptions = useMemo(
    () => TASK_PRIORITIES.map((p) => ({ value: p, label: capitalize(p) })),
    []
  );

  const assigneeOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...profiles.map((p) => ({ value: p.id, label: p.name })),
    ],
    [profiles]
  );

  const clientOptions = useMemo(
    () => [
      { value: "", label: "No Client" },
      ...clientsList.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clientsList]
  );

  const projectOptions = useMemo(
    () => [
      { value: "", label: "No Project" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects]
  );

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        // Reset project when client changes
        if (key === "client_id" && value !== prev.client_id) {
          next.project_id = "";
        }
        return next;
      });
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) {
      next.title = "Title is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
        client_id: form.client_id || null,
        project_id: form.project_id || null,
        due_date: form.due_date || null,
      };

      if (isEditing && task) {
        const res = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: task.id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error ?? "Failed to update task", "error");
          setSaving(false);
          return;
        }
        toast("Task updated successfully.", "success");
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error ?? "Failed to create task", "error");
          setSaving(false);
          return;
        }
        toast("Task created successfully.", "success");
      }

      setSaving(false);
      onOpenChange(false);
      onSaved();
    },
    [form, validate, isEditing, task, toast, onOpenChange, onSaved]
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold font-[var(--font-heading)] text-[var(--color-text)]">
              {isEditing ? "Edit Task" : "New Task"}
            </Dialog.Title>
            <Dialog.Close className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer">
              <X size={20} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Title *"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              error={errors.title}
            />

            <Textarea
              label="Description"
              placeholder="Task description..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Status"
                options={statusOptions}
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              />
              <SelectField
                label="Priority"
                options={priorityOptions}
                value={form.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              />
            </div>

            <SelectField
              label="Assigned To"
              options={assigneeOptions}
              value={form.assigned_to}
              onChange={(e) => updateField("assigned_to", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Client"
                options={clientOptions}
                value={form.client_id}
                onChange={(e) => updateField("client_id", e.target.value)}
              />
              <SelectField
                label="Project"
                options={projectOptions}
                value={form.project_id}
                onChange={(e) => updateField("project_id", e.target.value)}
              />
            </div>

            <Input
              label="Due Date"
              type="date"
              value={form.due_date}
              onChange={(e) => updateField("due_date", e.target.value)}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isEditing ? "Update Task" : "Create Task"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
