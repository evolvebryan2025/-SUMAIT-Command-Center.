# Phase 5: Security, Audit & Profile Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add profile editing, audit log viewer, security/session management, and automated cron alerts to the SUMAIT Command Center.

**Architecture:** Builds UI + API layers on top of existing Supabase tables (profiles, activity_log). Adds a service-role Supabase admin client for operations needing RLS bypass. Avatar storage via new Supabase bucket. Vercel cron triggers existing alert check endpoint daily.

**Tech Stack:** Next.js 16.2.0 (App Router), Supabase (Auth + Postgres + Storage), TypeScript, Tailwind CSS, Vercel Cron

**Spec:** `docs/superpowers/specs/2026-03-20-phase5-security-audit-profile-design.md`

---

## File Structure

```
New files:
  src/lib/supabase/admin.ts                         — Service-role Supabase client
  src/app/api/profile/route.ts                      — PATCH profile (name, avatarUrl)
  src/app/api/profile/avatar/route.ts               — POST avatar upload
  src/app/api/profile/password/route.ts             — POST password change
  src/app/api/auth/sign-out-all/route.ts            — POST global sign out
  src/app/api/auth/security-info/route.ts           — GET security info
  src/app/api/audit/route.ts                        — GET audit logs (paginated, filtered)
  src/app/(dashboard)/settings/profile/page.tsx     — Profile settings page
  src/app/(dashboard)/settings/security/page.tsx    — Security & sessions page
  src/app/(dashboard)/settings/audit/page.tsx       — Audit log viewer page
  src/components/settings/avatar-upload.tsx          — Avatar upload component
  src/components/settings/password-change-form.tsx   — Password change form
  supabase/migrations/004_phase5_avatars_bucket.sql — Avatar bucket + audit index
  vercel.json                                        — Cron configuration

Modified files:
  src/lib/supabase/middleware.ts                    — Add /api/alerts/check exclusion
  src/app/api/alerts/check/route.ts                 — Add cron secret auth + admin client
  src/app/(dashboard)/settings/page.tsx             — Add Profile, Security, Audit cards
```

---

### Task 1: Service-Role Supabase Admin Client

**Files:**
- Create: `src/lib/supabase/admin.ts`

- [ ] **Step 1: Create the admin client utility**

```typescript
// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds, no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/admin.ts
git commit -m "feat: add service-role Supabase admin client"
```

---

### Task 2: Database Migration — Avatars Bucket + Audit Index

**Files:**
- Create: `supabase/migrations/004_phase5_avatars_bucket.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Phase 5: Avatar storage bucket + audit log index

-- Avatar storage bucket (public for profile images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- File path convention: {user_id}/avatar.{ext}
-- storage.foldername extracts the folder segment = user_id

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Index for audit log filtering by action + entity_type
CREATE INDEX IF NOT EXISTS idx_activity_log_action_entity
  ON activity_log(action, entity_type);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/004_phase5_avatars_bucket.sql
git commit -m "feat: add Phase 5 migration — avatars bucket + audit index"
```

> **Note:** User must run this SQL in Supabase Dashboard SQL Editor before deployment.

---

### Task 3: Profile API Routes

**Files:**
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/api/profile/avatar/route.ts`
- Create: `src/app/api/profile/password/route.ts`

- [ ] **Step 1: Create PATCH /api/profile route**

```typescript
// src/app/api/profile/route.ts
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, avatarUrl } = body as {
      name?: string;
      avatarUrl?: string;
    };

    const payload: Record<string, unknown> = {};
    if (name !== undefined) payload.name = name.trim();
    if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "profile_updated", "profile", user.id, {
      fields: Object.keys(payload),
    }).catch(console.error);

    return NextResponse.json({ profile: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create POST /api/profile/avatar route**

```typescript
// src/app/api/profile/avatar/route.ts
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, or WebP." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar.${ext}`;

    // Delete existing avatar files in user's folder
    const { data: existing } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (existing && existing.length > 0) {
      const filesToDelete = existing.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    // Upload new avatar
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    logActivity(supabase, "avatar_updated", "profile", user.id).catch(console.error);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload avatar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create POST /api/profile/password route**

```typescript
// src/app/api/profile/password/route.ts
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // Verify current password using user-scoped client (not admin)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Update password via admin client (bypasses requiring old session)
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    logActivity(supabase, "password_changed", "profile", user.id).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to change password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile/
git commit -m "feat: add profile API routes (update, avatar upload, password change)"
```

---

### Task 4: Auth API Routes (Security Info + Sign Out All)

**Files:**
- Create: `src/app/api/auth/sign-out-all/route.ts`
- Create: `src/app/api/auth/security-info/route.ts`

- [ ] **Step 1: Create POST /api/auth/sign-out-all route**

```typescript
// src/app/api/auth/sign-out-all/route.ts
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    logActivity(supabase, "global_sign_out", "profile", user.id).catch(console.error);

    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign out";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create GET /api/auth/security-info route**

```typescript
// src/app/api/auth/security-info/route.ts
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get profile for role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Get auth user details via admin client for last_sign_in_at
    const adminClient = createAdminClient();
    const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);

    return NextResponse.json({
      lastSignIn: authUser?.user?.last_sign_in_at ?? null,
      createdAt: authUser?.user?.created_at ?? user.created_at,
      role: profile?.role ?? "member",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get security info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/sign-out-all/ src/app/api/auth/security-info/
git commit -m "feat: add auth API routes (security info, global sign out)"
```

---

### Task 5: Audit Log API Route

**Files:**
- Create: `src/app/api/audit/route.ts`

- [ ] **Step 1: Create GET /api/audit route**

```typescript
// src/app/api/audit/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Admin only
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const action = params.get("action");
    const entityType = params.get("entityType");
    const userId = params.get("userId");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const search = params.get("search");
    const cursor = params.get("cursor");
    const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);

    let query = supabase
      .from("activity_log")
      .select("*, profiles:user_id(name, email)")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1); // +1 to detect if there's a next page

    if (action) query = query.eq("action", action);
    if (entityType) query = query.eq("entity_type", entityType);
    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59.999Z");
    if (search) {
      // Sanitize search input: escape PostgREST special characters
      const sanitized = search.replace(/[%_.,()]/g, "");
      if (sanitized) {
        query = query.or(`action.ilike.%${sanitized}%,entity_type.ilike.%${sanitized}%`);
      }
    }

    // Cursor-based pagination: fetch items older than cursor
    // Uses compound cursor (created_at + id) to handle timestamp collisions
    if (cursor) {
      const { data: cursorItem } = await supabase
        .from("activity_log")
        .select("created_at")
        .eq("id", cursor)
        .single();

      if (cursorItem) {
        // Items with earlier timestamp, OR same timestamp but smaller id
        query = query.or(
          `created_at.lt.${cursorItem.created_at},and(created_at.eq.${cursorItem.created_at},id.lt.${cursor})`
        );
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const logs = data ?? [];
    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({ logs: items, nextCursor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/audit/
git commit -m "feat: add audit log API with pagination, filtering, and search"
```

---

### Task 6: Profile Settings Page

**Files:**
- Create: `src/components/settings/avatar-upload.tsx`
- Create: `src/components/settings/password-change-form.tsx`
- Create: `src/app/(dashboard)/settings/profile/page.tsx`

- [ ] **Step 1: Create AvatarUpload component**

```typescript
// src/components/settings/avatar-upload.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/providers/toast-provider";

interface AvatarUploadProps {
  currentUrl: string | null;
  userName: string;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ currentUrl, userName, onUploaded }: AvatarUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFile = useCallback(async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast("Invalid file type. Use JPEG, PNG, or WebP.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("File too large. Max 2MB.", "error");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        onUploaded(data.url);
        toast("Avatar updated", "success");
      } else {
        toast(data.error ?? "Upload failed", "error");
        setPreview(currentUrl);
      }
    } catch {
      toast("Upload failed", "error");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }, [currentUrl, onUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className="relative w-24 h-24 rounded-full cursor-pointer group"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {preview ? (
        <img src={preview} alt={userName} className="w-24 h-24 rounded-full object-cover" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-2xl font-bold">
          {initials}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading ? (
          <Loader2 size={20} className="text-white animate-spin" />
        ) : (
          <Camera size={20} className="text-white" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create PasswordChangeForm component**

```typescript
// src/components/settings/password-change-form.tsx
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
```

- [ ] **Step 3: Create the Profile Settings page**

```typescript
// src/app/(dashboard)/settings/profile/page.tsx
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

  // Initialize name from profile once loaded
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

      {/* Profile info card */}
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

      {/* Password change */}
      <PasswordChangeForm />
    </div>
  );
}
```

- [ ] **Step 4: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/avatar-upload.tsx src/components/settings/password-change-form.tsx src/app/\(dashboard\)/settings/profile/
git commit -m "feat: add profile settings page with avatar upload and password change"
```

---

### Task 7: Security Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/security/page.tsx`

- [ ] **Step 1: Create the Security Settings page**

```typescript
// src/app/(dashboard)/settings/security/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut, Shield, Clock, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { createClient } from "@/lib/supabase/client";
import { formatDate, capitalize } from "@/lib/utils";

interface SecurityInfo {
  lastSignIn: string | null;
  createdAt: string;
  role: string;
}

export default function SecuritySettingsPage() {
  const { profile, loading: profileLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [info, setInfo] = useState<SecurityInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/security-info");
        if (res.ok) {
          const data = await res.json();
          setInfo(data);
        }
      } catch {
        // Ignore
      } finally {
        setLoadingInfo(false);
      }
    }
    load();
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const handleSignOutAll = useCallback(async () => {
    setSigningOutAll(true);
    try {
      const res = await fetch("/api/auth/sign-out-all", { method: "POST" });
      if (res.ok) {
        toast("Signed out from all devices", "success");
        router.push("/login");
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to sign out", "error");
        setSigningOutAll(false);
      }
    } catch {
      toast("Failed to sign out", "error");
      setSigningOutAll(false);
    }
  }, [toast, router]);

  const isLoading = profileLoading || loadingInfo;

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
            Security
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your account security and sessions.
          </p>
        </div>
      </div>

      {/* Security overview */}
      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2 mb-4">
          <Shield size={20} className="text-[var(--color-primary)]" />
          Account Overview
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-1 flex items-center gap-1">
                <UserCircle size={12} /> Role
              </span>
              <Badge variant={info?.role === "admin" ? "active" : "info"}>
                {capitalize(info?.role ?? "member")}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-1 flex items-center gap-1">
                <Clock size={12} /> Account Created
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {info?.createdAt ? formatDate(info.createdAt) : "—"}
              </span>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-1 flex items-center gap-1">
                <Clock size={12} /> Last Sign In
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {info?.lastSignIn ? formatDate(info.lastSignIn) : "—"}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Session management */}
      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2 mb-4">
          <LogOut size={20} className="text-[var(--color-primary)]" />
          Sessions
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Sign out of your current session or all devices at once.
        </p>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Sign Out"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSignOutAll} disabled={signingOutAll}>
            {signingOutAll ? "Signing out..." : "Sign Out All Devices"}
          </Button>
        </div>
      </Card>

      {/* Password change */}
      <PasswordChangeForm />
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/settings/security/
git commit -m "feat: add security settings page with session management"
```

---

### Task 8: Audit Log Viewer Page

**Files:**
- Create: `src/app/(dashboard)/settings/audit/page.tsx`

- [ ] **Step 1: Create the Audit Log Viewer page**

```typescript
// src/app/(dashboard)/settings/audit/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Search, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { formatDate, capitalize } from "@/lib/utils";

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: { name: string; email: string } | null;
}

const ENTITY_TYPES = [
  { value: "", label: "All entities" },
  { value: "client", label: "Client" },
  { value: "task", label: "Task" },
  { value: "employee", label: "Employee" },
  { value: "profile", label: "Profile" },
  { value: "credential", label: "Credential" },
  { value: "knowledge_doc", label: "Knowledge Doc" },
];

const ACTION_TYPES = [
  { value: "", label: "All actions" },
  { value: "created", label: "Created" },
  { value: "invited", label: "Invited" },
  { value: "profile_updated", label: "Profile Updated" },
  { value: "avatar_updated", label: "Avatar Updated" },
  { value: "password_changed", label: "Password Changed" },
  { value: "global_sign_out", label: "Global Sign Out" },
  { value: "client_lifecycle_updated", label: "Lifecycle Updated" },
  { value: "knowledge_doc_updated", label: "Doc Updated" },
  { value: "knowledge_doc_deleted", label: "Doc Deleted" },
];

export default function AuditLogPage() {
  const { isAdmin, loading: userLoading } = useUser();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ value: string; label: string }[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch team members for user filter dropdown
  useEffect(() => {
    async function loadTeam() {
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        const { data } = await supabase.from("profiles").select("id, name").eq("is_active", true);
        setTeamMembers([
          { value: "", label: "All users" },
          ...(data ?? []).map((p) => ({ value: p.id, label: p.name })),
        ]);
      } catch { /* ignore */ }
    }
    loadTeam();
  }, []);

  const fetchLogs = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (actionType) params.set("action", actionType);
    if (entityType) params.set("entityType", entityType);
    if (userId) params.set("userId", userId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (isLoadMore) {
          setLogs((prev) => [...prev, ...data.logs]);
        } else {
          setLogs(data.logs);
        }
        setNextCursor(data.nextCursor);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, actionType, entityType, userId, startDate, endDate]);

  useEffect(() => {
    if (!userLoading && isAdmin) fetchLogs();
  }, [userLoading, isAdmin, fetchLogs]);

  const handleSearch = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!userLoading && !isAdmin) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[var(--color-text-secondary)]">Admin access required.</p>
      </div>
    );
  }

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
            Audit Log
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            View all system activity and changes.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Search"
            placeholder="Search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <SelectField
            label="Action Type"
            options={ACTION_TYPES}
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          />
          <SelectField
            label="Entity Type"
            options={ENTITY_TYPES}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
          {teamMembers.length > 1 && (
            <SelectField
              label="User"
              options={teamMembers}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          )}
          <Input
            label="From"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Button size="sm" onClick={handleSearch}>
            <Search size={14} className="mr-1" /> Search
          </Button>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
          No audit log entries found.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => (
            <Card key={entry.id} className="!p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {capitalize(entry.action.replace(/_/g, " "))}
                      </span>
                      <Badge variant="neutral">{entry.entity_type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-secondary)]">
                      <span>{formatDate(entry.created_at)}</span>
                      {entry.profiles?.name && <span>by {entry.profiles.name}</span>}
                    </div>
                  </div>
                </div>
                {Object.keys(entry.metadata).length > 0 && (
                  expandedId === entry.id
                    ? <ChevronUp size={16} className="text-[var(--color-text-secondary)]" />
                    : <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
                )}
              </div>
              {expandedId === entry.id && Object.keys(entry.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <pre className="text-xs text-[var(--color-text-secondary)] overflow-x-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchLogs(nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/settings/audit/
git commit -m "feat: add audit log viewer with filtering, search, and pagination"
```

---

### Task 9: Update Settings Page

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Update settings page to add Profile, Security (linked), and Audit cards**

Replace the entire content of `src/app/(dashboard)/settings/page.tsx` with:

```typescript
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, FileText, Palette, Shield, User, Webhook } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export default function SettingsPage() {
  const { isAdmin } = useUser();

  return (
    <div>
      <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-2">
        Settings
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Manage your command center configuration.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/settings/profile">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Edit your name, avatar, and password</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/security">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage sessions and account security</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/dev-kits">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Dev Kits</CardTitle>
                  <CardDescription>Manage brand kits and theme switching</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/notifications">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Email, Slack, and in-app notification settings</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/integrations">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Webhook className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>n8n webhooks, Instantly accounts, and API keys</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {isAdmin && (
          <Link href="/settings/audit">
            <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="text-[var(--color-primary)]" size={24} />
                  <div>
                    <CardTitle>Audit Log</CardTitle>
                    <CardDescription>View all system activity and changes</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: update settings page with profile, security, and audit log cards"
```

---

### Task 10: Cron Setup — Middleware Bypass + Alert Check Auth + vercel.json

**Files:**
- Modify: `src/lib/supabase/middleware.ts`
- Modify: `src/app/api/alerts/check/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Update middleware to exclude /api/alerts/check**

In `src/lib/supabase/middleware.ts`, add the alerts path to the exclusion condition. Change the `if` block at line 30-34:

Old:
```typescript
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/api/auth")
  ) {
```

New:
```typescript
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/api/auth") &&
    !request.nextUrl.pathname.startsWith("/api/alerts/check")
  ) {
```

- [ ] **Step 2: Update alerts/check route to support cron auth + admin client**

Replace the entire content of `src/app/api/alerts/check/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { sendSlackNotification } from "@/lib/slack";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

function isCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("x-vercel-cron-secret") === cronSecret;
}

export async function GET(request: NextRequest) {
  try {
    let supabase: SupabaseClient;

    if (isCronRequest(request)) {
      // Cron: use service-role client to bypass RLS
      supabase = createAdminClient();
    } else {
      // Manual: require authenticated user
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];
    const created: string[] = [];

    // 1. Overdue tasks — also notify assignees
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, assigned_to")
      .lt("due_date", today)
      .neq("status", "completed");

    for (const task of overdueTasks || []) {
      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("entity_type", "task")
        .eq("entity_id", task.id)
        .eq("type", "task_overdue")
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existing) {
        await supabase.from("alerts").insert({
          type: "task_overdue",
          title: `Overdue: ${task.title}`,
          message: `Task "${task.title}" is past its due date`,
          severity: "high",
          entity_type: "task",
          entity_id: task.id,
        });
        created.push(`task:${task.id}`);

        if (task.assigned_to) {
          const { data: assignee } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", task.assigned_to)
            .single();

          notify({
            supabase,
            userId: task.assigned_to,
            email: assignee?.email,
            title: `Overdue: ${task.title}`,
            message: `Your task "${task.title}" is past its due date. Please update the status.`,
            type: "task_overdue",
            entityType: "tasks",
            entityId: task.id,
          }).catch(console.error);
        }
      }
    }

    // 2. Overdue contact tasks
    const { data: overdueContactTasks } = await supabase
      .from("contact_tasks")
      .select("id, title, assigned_to")
      .lt("due_date", today)
      .neq("status", "completed");

    for (const task of overdueContactTasks || []) {
      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("entity_type", "contact_task")
        .eq("entity_id", task.id)
        .eq("type", "task_overdue")
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existing) {
        await supabase.from("alerts").insert({
          type: "task_overdue",
          title: `Overdue: ${task.title}`,
          message: `Contact task "${task.title}" is past its due date`,
          severity: "high",
          entity_type: "contact_task",
          entity_id: task.id,
        });
        created.push(`contact_task:${task.id}`);

        if (task.assigned_to) {
          const { data: assignee } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", task.assigned_to)
            .single();

          notify({
            supabase,
            userId: task.assigned_to,
            email: assignee?.email,
            title: `Overdue: ${task.title}`,
            message: `Contact task "${task.title}" is past its due date.`,
            type: "task_overdue",
            entityType: "tasks",
            entityId: task.id,
          }).catch(console.error);
        }
      }
    }

    // 3. Low health clients — notify admins + Slack
    const { data: unhealthyClients } = await supabase
      .from("clients")
      .select("id, name, health_score")
      .lt("health_score", 40)
      .eq("status", "active");

    for (const client of unhealthyClients || []) {
      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("entity_type", "client")
        .eq("entity_id", client.id)
        .eq("type", "client_health")
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existing) {
        const severity = client.health_score < 20 ? "critical" : "high";

        await supabase.from("alerts").insert({
          type: "client_health",
          title: `Low health: ${client.name}`,
          message: `Client health score is ${client.health_score}/100`,
          severity,
          entity_type: "client",
          entity_id: client.id,
        });
        created.push(`client:${client.id}`);

        sendSlackNotification({
          title: `Client Health Alert: ${client.name}`,
          message: `Health score dropped to *${client.health_score}/100* (${severity}).`,
          type: "client_health",
          entityType: "clients",
          entityId: client.id,
        }).catch(console.error);
      }
    }

    return NextResponse.json({
      success: true,
      checked: today,
      alerts_created: created.length,
      details: created,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Alert check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create vercel.json with cron config**

```json
{
  "crons": [
    {
      "path": "/api/alerts/check",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- [ ] **Step 4: Verify build passes**

Run: `cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center" && npx next build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/middleware.ts src/app/api/alerts/check/route.ts vercel.json
git commit -m "feat: add Vercel cron for daily alert checks with service-role auth"
```

---

### Task 11: Deploy Phase 5

- [ ] **Step 1: Remind user to run migration SQL**

User must run `supabase/migrations/004_phase5_avatars_bucket.sql` in Supabase Dashboard SQL Editor.

- [ ] **Step 2: Generate and set CRON_SECRET on Vercel**

```bash
# Generate a random cron secret
openssl rand -hex 32
# Add to Vercel
npx vercel env add CRON_SECRET production
```

- [ ] **Step 3: Deploy to Vercel**

```bash
cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center"
npx vercel --prod --yes
```

- [ ] **Step 4: Disable SSO protection**

```bash
bash scripts/vercel-disable-sso.sh
```

- [ ] **Step 5: Verify deployment returns 200/307**

```bash
curl -s -o /dev/null -w "%{http_code}" https://sumait-command-center.vercel.app
```
Expected: 307 (redirect to login)

- [ ] **Step 6: Commit deploy URL to vercel-deployments.csv if needed**
