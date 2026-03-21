"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/providers/toast-provider";
import { Lock } from "lucide-react";

export function PasswordChangeForm() {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.currentPassword || !form.newPassword) {
      toast("All fields are required", "error");
      return;
    }
    if (form.newPassword.length < 8) {
      toast("New password must be at least 8 characters", "error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Password changed successfully", "success");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast(data.error ?? "Failed to change password", "error");
      }
    } catch {
      toast("Failed to change password", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2 mb-4">
        <Lock size={20} className="text-[var(--color-primary)]" />
        Change Password
      </h3>
      <div className="space-y-4 max-w-md">
        <Input
          label="Current Password"
          type="password"
          value={form.currentPassword}
          onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
        />
        <Input
          label="New Password"
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
        />
        <Button size="sm" onClick={handleSubmit} disabled={saving}>
          {saving ? "Changing..." : "Change Password"}
        </Button>
      </div>
    </Card>
  );
}
