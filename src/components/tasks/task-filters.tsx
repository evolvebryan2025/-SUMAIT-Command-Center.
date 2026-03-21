"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { SelectField } from "@/components/ui/select-field";
import type { Profile, Client } from "@/lib/types";
import type { TaskStatus, TaskPriority } from "@/lib/types";

export interface TaskFilters {
  status: string;
  priority: string;
  assignee: string;
  client: string;
}

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

export function TaskFiltersBar({ filters, onChange }: TaskFiltersBarProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function loadOptions() {
      const [profilesRes, clientsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("is_active", true).order("name").limit(100),
        supabase.from("clients").select("*").order("name").limit(500),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
    }

    loadOptions();
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Statuses" },
      ...TASK_STATUSES.map((s) => ({ value: s, label: capitalize(s) })),
    ],
    []
  );

  const priorityOptions = useMemo(
    () => [
      { value: "all", label: "All Priorities" },
      ...TASK_PRIORITIES.map((p) => ({ value: p, label: capitalize(p) })),
    ],
    []
  );

  const assigneeOptions = useMemo(
    () => [
      { value: "all", label: "All Assignees" },
      ...profiles.map((p) => ({ value: p.id, label: p.name })),
    ],
    [profiles]
  );

  const clientOptions = useMemo(
    () => [
      { value: "all", label: "All Clients" },
      ...clients.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clients]
  );

  const handleChange = useCallback(
    (key: keyof TaskFilters, value: string) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="w-full sm:w-44">
        <SelectField
          options={statusOptions}
          value={filters.status}
          onChange={(e) => handleChange("status", e.target.value)}
        />
      </div>
      <div className="w-full sm:w-44">
        <SelectField
          options={priorityOptions}
          value={filters.priority}
          onChange={(e) => handleChange("priority", e.target.value)}
        />
      </div>
      <div className="w-full sm:w-44">
        <SelectField
          options={assigneeOptions}
          value={filters.assignee}
          onChange={(e) => handleChange("assignee", e.target.value)}
        />
      </div>
      <div className="w-full sm:w-44">
        <SelectField
          options={clientOptions}
          value={filters.client}
          onChange={(e) => handleChange("client", e.target.value)}
        />
      </div>
    </div>
  );
}
