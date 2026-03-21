"use client";

import { useState } from "react";
import { useToast } from "@/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity-logger";

interface EmployeeFormProps {
  onSave?: () => void;
}

interface FormData {
  name: string;
  email: string;
  role: "admin" | "member";
}

export function EmployeeForm({ onSave }: EmployeeFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    role: "member",
  });

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) {
      next.name = "Name is required";
    }
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Invalid email address";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to invite employee");
      }

      const supabase = createClient();
      await logActivity(supabase, "created", "employee", result.userId ?? null, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      });

      toast("Employee invited successfully", "success");
      onSave?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to invite employee";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  const roleOptions = [
    { value: "member", label: "Member" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Employee</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          error={errors.name}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="email@example.com"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          error={errors.email}
          required
        />
        <SelectField
          label="Role"
          options={roleOptions}
          value={form.role}
          onChange={(e) => updateField("role", e.target.value as "admin" | "member")}
        />
        <div className="pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Inviting..." : "Invite Employee"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
