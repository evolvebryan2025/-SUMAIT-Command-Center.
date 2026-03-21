"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, capitalize } from "@/lib/utils";

export default function ProfileSettingsPage() {
  const { profile, loading } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [nameInitialized, setNameInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  if (profile && !nameInitialized) {
    setName(profile.name);
    setNameInitialized(true);
  }

  const handleSaveName = useCallback(async () => {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Profile updated", "success");
      } else {
        toast(data.error ?? "Failed to update", "error");
      }
    } catch {
      toast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }, [name, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 rounded-[var(--radius)] hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
            Profile Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your personal information.
          </p>
        </div>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2 mb-4">
          <User size={20} className="text-[var(--color-primary)]" />
          Profile Information
        </h3>
        <div className="flex items-start gap-6">
          <AvatarUpload
            currentUrl={profile.avatar_url}
            userName={profile.name}
            onUploaded={() => window.location.reload()}
          />
          <div className="flex-1 space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={saving || name === profile.name}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-1">Email</span>
              <span className="text-sm text-[var(--color-text)]">{profile.email}</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">Role</span>
                <Badge variant={profile.role === "admin" ? "active" : "info"}>
                  {capitalize(profile.role)}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">Member Since</span>
                <span className="text-sm text-[var(--color-text)]">{formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <PasswordChangeForm />
    </div>
  );
}
