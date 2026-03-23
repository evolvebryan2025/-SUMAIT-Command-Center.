# Client Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give clients magic-link access to a branded portal where they see their tasks (completed/pending/blocked), comment on tasks, respond to blockers, and view delivered resources — with zero visibility into employees or other clients.

**Architecture:** New `client` role in existing Supabase Auth. Portal lives at `/portal` route group with its own layout (no sidebar, branded per client). Two isolated comment systems per task: internal (`task_comments`) and client-facing (`client_comments`). Sub-client hierarchy uses existing `parent_client_id`. Admin generates magic links from client detail page.

**Tech Stack:** Next.js 16, Supabase Auth (magic links), Supabase RLS, Tailwind CSS v4, Radix UI, Lucide icons.

---

## Phase 1: Database Foundation

### Task 1: Migration — Client Portal Tables + RLS

**Files:**
- Create: `supabase/migrations/011_client_portal.sql`

**Step 1: Write the migration SQL**

```sql
-- 011_client_portal.sql
-- Client Portal: auth linking, client comments, client branding, role update

-- 1. Update role check on profiles to include 'client'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'lead', 'member', 'client'));

-- 2. Client portal access — links auth user to client record
CREATE TABLE client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id),
  UNIQUE(client_id)
);

ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage all portal access
CREATE POLICY "Admins manage portal access"
  ON client_portal_access FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients can read their own access record
CREATE POLICY "Clients read own access"
  ON client_portal_access FOR SELECT
  USING (user_id = auth.uid());

-- 3. Client comments — completely separate from task_comments
CREATE TABLE client_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('client', 'admin')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_comments_task ON client_comments(task_id);
CREATE INDEX idx_client_comments_author ON client_comments(author_id);

ALTER TABLE client_comments ENABLE ROW LEVEL SECURITY;

-- Helper: get all client_ids a portal user can see (self + sub-clients)
CREATE OR REPLACE FUNCTION get_portal_client_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT c.id FROM clients c
  INNER JOIN client_portal_access cpa ON cpa.client_id = c.id OR c.parent_client_id = cpa.client_id
  WHERE cpa.user_id = p_user_id AND cpa.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is a client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'client'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Admins full access to client comments
CREATE POLICY "Admins manage client comments"
  ON client_comments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients can read comments on tasks they can see
CREATE POLICY "Clients read comments on accessible tasks"
  ON client_comments FOR SELECT
  USING (
    is_client() AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = client_comments.task_id
      AND t.client_id IN (SELECT get_portal_client_ids(auth.uid()))
    )
  );

-- Clients can insert comments on tasks they can see
CREATE POLICY "Clients insert comments"
  ON client_comments FOR INSERT
  WITH CHECK (
    is_client()
    AND author_id = auth.uid()
    AND author_type = 'client'
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = client_comments.task_id
      AND t.client_id IN (SELECT get_portal_client_ids(auth.uid()))
    )
  );

-- Members (employees) can read client comments on tasks assigned to them
CREATE POLICY "Members read client comments on assigned tasks"
  ON client_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = client_comments.task_id
      AND t.assigned_to = auth.uid()
    )
  );

-- 4. Client branding — dev kit tokens per client
CREATE TABLE client_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  primary_bg TEXT NOT NULL DEFAULT '#09090B',
  accent_color TEXT NOT NULL DEFAULT '#3b82f6',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  font_heading TEXT NOT NULL DEFAULT 'Inter',
  font_body TEXT NOT NULL DEFAULT 'Inter',
  extra_tokens JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_branding ENABLE ROW LEVEL SECURITY;

-- Admins manage branding
CREATE POLICY "Admins manage client branding"
  ON client_branding FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients read their own branding
CREATE POLICY "Clients read own branding"
  ON client_branding FOR SELECT
  USING (
    is_client() AND client_id IN (SELECT get_portal_client_ids(auth.uid()))
  );

-- 5. RLS for tasks — clients can read tasks linked to their client IDs
CREATE POLICY "Clients read own tasks"
  ON tasks FOR SELECT
  USING (
    is_client() AND client_id IN (SELECT get_portal_client_ids(auth.uid()))
  );

-- 6. RLS for projects — clients can read projects linked to their client IDs
CREATE POLICY "Clients read own projects"
  ON projects FOR SELECT
  USING (
    is_client() AND client_id IN (SELECT get_portal_client_ids(auth.uid()))
  );

-- 7. RLS for notifications — clients can read their own notifications
CREATE POLICY "Clients read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() AND is_client());

CREATE POLICY "Clients update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid() AND is_client())
  WITH CHECK (user_id = auth.uid() AND is_client());

-- 8. Trigger: update last_accessed on portal login
CREATE OR REPLACE FUNCTION update_portal_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE client_portal_access
  SET last_accessed = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Run migration in Supabase SQL editor**

Copy the contents of `011_client_portal.sql` and run in the Supabase dashboard SQL editor at https://supabase.com/dashboard.

**Step 3: Verify migration applied**

```bash
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/client_portal_access?select=id&limit=1"
# Expected: [] (empty array, table exists)

curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/client_comments?select=id&limit=1"
# Expected: [] (empty array, table exists)

curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/client_branding?select=id&limit=1"
# Expected: [] (empty array, table exists)
```

**Step 4: Commit**

```bash
git add supabase/migrations/011_client_portal.sql
git commit -m "feat: add client portal migration — portal access, client comments, branding tables + RLS"
```

---

### Task 2: TypeScript Types + Constants

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/constants.ts`

**Step 1: Add client to UserRole type**

In `src/lib/types.ts`, update line 1:

```typescript
// Before
export type UserRole = "admin" | "lead" | "member";

// After
export type UserRole = "admin" | "lead" | "member" | "client";
```

**Step 2: Add new interfaces to `src/lib/types.ts`**

Append after the existing interfaces:

```typescript
export interface ClientPortalAccess {
  id: string;
  user_id: string;
  client_id: string;
  invited_by: string;
  invited_at: string;
  last_accessed: string | null;
  is_active: boolean;
}

export type ClientCommentAuthorType = "client" | "admin";

export interface ClientComment {
  id: string;
  task_id: string;
  author_id: string;
  author_type: ClientCommentAuthorType;
  content: string;
  attachments: unknown[];
  created_at: string;
  // Joined fields
  author_name?: string;
}

export interface ClientBranding {
  id: string;
  client_id: string;
  brand_name: string;
  logo_url: string | null;
  primary_bg: string;
  accent_color: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  extra_tokens: Record<string, string>;
  created_at: string;
  updated_at: string;
}
```

**Step 3: Add NotificationType for client comments**

In `src/lib/types.ts`, update the NotificationType:

```typescript
// Before
export type NotificationType = "task_assigned" | "task_overdue" | "task_due_soon" | "client_health" | "report_ready" | "comment_reply" | "question_posted" | "blocker_raised" | "daily_report_missing" | "system" | "info";

// After
export type NotificationType = "task_assigned" | "task_overdue" | "task_due_soon" | "client_health" | "report_ready" | "comment_reply" | "question_posted" | "blocker_raised" | "daily_report_missing" | "client_comment" | "system" | "info";
```

**Step 4: Add constants to `src/lib/constants.ts`**

Append to the file:

```typescript
export const CLIENT_COMMENT_AUTHOR_TYPES = ["client", "admin"] as const;

export const PORTAL_DEFAULT_BRANDING = {
  brand_name: "SUMAIT AI",
  primary_bg: "#09090B",
  accent_color: "#3b82f6",
  text_color: "#ffffff",
  font_heading: "Inter",
  font_body: "Inter",
} as const;

export const PORTAL_TASK_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
  blocked: "Blocked",
};

export const PORTAL_TASK_STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  in_progress: "#3b82f6",
  pending: "#6b7280",
  blocked: "#ef4444",
};
```

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add client portal types — ClientPortalAccess, ClientComment, ClientBranding + constants"
```

---

## Phase 2: Auth + Middleware

### Task 3: Update Middleware for Client Role Routing

**Files:**
- Modify: `src/lib/supabase/middleware.ts`

**Step 1: Update middleware to route clients to /portal**

Replace the entire file:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes — no auth required
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/alerts/check");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Fetch role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (role === "client") {
      // Clients can only access /portal and /api/portal routes
      const isPortalRoute =
        pathname.startsWith("/portal") ||
        pathname.startsWith("/api/portal") ||
        pathname.startsWith("/api/auth");

      if (!isPortalRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return NextResponse.redirect(url);
      }
    } else if (pathname.startsWith("/portal")) {
      // Non-clients cannot access /portal
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
```

**Step 2: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat: route client role to /portal, block non-clients from /portal"
```

---

### Task 4: Update useUser Hook for Client Role

**Files:**
- Modify: `src/hooks/use-user.ts`

**Step 1: Add isClient and clientId to the hook**

Replace the entire file:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ClientPortalAccess } from "@/lib/types";

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portalAccess, setPortalAccess] = useState<ClientPortalAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);

        // If client role, fetch portal access for client_id
        if (data?.role === "client") {
          const { data: access } = await supabase
            .from("client_portal_access")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          setPortalAccess(access);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  return {
    profile,
    portalAccess,
    loading,
    isAdmin: profile?.role === "admin",
    isClient: profile?.role === "client",
    clientId: portalAccess?.client_id ?? null,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-user.ts
git commit -m "feat: extend useUser with isClient, clientId, portalAccess"
```

---

### Task 5: Auth Callback — Route Clients to Portal

**Files:**
- Modify: `src/app/api/auth/callback/route.ts`

**Step 1: Update callback to detect client role and redirect**

Replace the entire file:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user is a client — route to portal
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "client") {
          // Update last_accessed
          await supabase
            .from("client_portal_access")
            .update({ last_accessed: new Date().toISOString() })
            .eq("user_id", user.id);

          return NextResponse.redirect(`${origin}/portal`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

**Step 2: Commit**

```bash
git add src/app/api/auth/callback/route.ts
git commit -m "feat: route client role to /portal on auth callback, update last_accessed"
```

---

## Phase 3: Admin — Portal Invite API

### Task 6: Invite Client to Portal API

**Files:**
- Create: `src/app/api/portal/invite/route.ts`

**Step 1: Write the invite API**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can invite
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { client_id?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { client_id, email } = body;

  if (!client_id || !email?.trim()) {
    return NextResponse.json({ error: "client_id and email are required" }, { status: 400 });
  }

  // Check client exists
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", client_id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Check if portal access already exists for this client
  const adminClient = createAdminClient();
  const { data: existingAccess } = await adminClient
    .from("client_portal_access")
    .select("id, user_id, is_active")
    .eq("client_id", client_id)
    .single();

  let authUserId: string;

  if (existingAccess) {
    // Reactivate if deactivated
    if (!existingAccess.is_active) {
      await adminClient
        .from("client_portal_access")
        .update({ is_active: true })
        .eq("id", existingAccess.id);
    }
    authUserId = existingAccess.user_id;
  } else {
    // Create auth user for client (or find existing)
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email.trim()
    );

    if (existingUser) {
      authUserId = existingUser.id;
    } else {
      // Create new auth user with client role
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim(),
        email_confirm: true,
        user_metadata: { name: client.name, role: "client" },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      authUserId = newUser.user.id;

      // Ensure profile exists with client role
      await adminClient.from("profiles").upsert({
        id: authUserId,
        name: client.name,
        email: email.trim(),
        role: "client",
        is_active: true,
      });
    }

    // Create portal access link
    await adminClient.from("client_portal_access").insert({
      user_id: authUserId,
      client_id,
      invited_by: user.id,
    });
  }

  // Generate magic link
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim(),
    options: {
      redirectTo: `${request.nextUrl.origin}/api/auth/callback?next=/portal`,
    },
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  logActivity(supabase, "portal_invite_sent", "clients", client_id, {
    email: email.trim(),
    client_name: client.name,
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    magic_link: linkData.properties?.action_link,
    message: `Portal invite generated for ${client.name}`,
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/portal/invite/route.ts
git commit -m "feat: add portal invite API — creates client auth user, generates magic link"
```

---

### Task 7: Portal Access Management API

**Files:**
- Create: `src/app/api/portal/access/route.ts`

**Step 1: Write the access management API**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — Fetch portal access for a client
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = request.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_portal_access")
    .select("*, profiles!client_portal_access_user_id_fkey(name, email)")
    .eq("client_id", clientId)
    .single();

  if (error) {
    return NextResponse.json({ access: null });
  }

  return NextResponse.json({ access: data });
}

// PATCH — Toggle active/revoke access
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { client_id?: string; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { client_id, is_active } = body;
  if (!client_id || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "client_id and is_active required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_portal_access")
    .update({ is_active })
    .eq("client_id", client_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ access: data });
}
```

**Step 2: Commit**

```bash
git add src/app/api/portal/access/route.ts
git commit -m "feat: add portal access API — fetch status, toggle active/revoke"
```

---

### Task 8: Admin UI — Portal Access Section on Client Detail

**Files:**
- Create: `src/components/clients/portal-access-tab.tsx`

**Step 1: Write the portal access component**

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, Shield, ShieldOff, Clock, Copy } from "lucide-react";
import type { Client } from "@/lib/types";

interface PortalAccessTabProps {
  client: Client;
}

interface PortalAccessData {
  id: string;
  user_id: string;
  client_id: string;
  invited_at: string;
  last_accessed: string | null;
  is_active: boolean;
}

export function PortalAccessTab({ client }: PortalAccessTabProps) {
  const [access, setAccess] = useState<PortalAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState(client.email || "");
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccess();
  }, [client.id]);

  async function fetchAccess() {
    setLoading(true);
    const res = await fetch(`/api/portal/access?client_id=${client.id}`);
    const data = await res.json();
    setAccess(data.access);
    setLoading(false);
  }

  async function handleInvite() {
    setInviting(true);
    setError(null);
    setMagicLink(null);

    const res = await fetch("/api/portal/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: client.id, email: email.trim() }),
    });

    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setMagicLink(data.magic_link);
      await fetchAccess();
    }
    setInviting(false);
  }

  async function handleToggleAccess() {
    if (!access) return;
    const res = await fetch("/api/portal/access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: client.id, is_active: !access.is_active }),
    });
    const data = await res.json();
    if (data.access) setAccess(data.access);
  }

  async function copyLink() {
    if (magicLink) {
      await navigator.clipboard.writeText(magicLink);
    }
  }

  if (loading) {
    return <Card className="p-6 animate-pulse h-32" />;
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Portal Access</h3>
        {access && (
          <Badge variant={access.is_active ? "active" : "danger"}>
            {access.is_active ? "Active" : "Revoked"}
          </Badge>
        )}
      </div>

      {access ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Clock size={14} />
            <span>
              Invited: {new Date(access.invited_at).toLocaleDateString()}
              {access.last_accessed && (
                <> | Last accessed: {new Date(access.last_accessed).toLocaleDateString()}</>
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleToggleAccess}
              variant="outline"
              size="sm"
            >
              {access.is_active ? <ShieldOff size={14} /> : <Shield size={14} />}
              {access.is_active ? "Revoke Access" : "Reactivate"}
            </Button>

            <Button
              onClick={handleInvite}
              variant="outline"
              size="sm"
              disabled={inviting}
            >
              <RefreshCw size={14} className={inviting ? "animate-spin" : ""} />
              Regenerate Link
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No portal access configured. Send a magic link to give this client access.
          </p>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Client email"
              className="flex-1"
            />
            <Button
              onClick={handleInvite}
              disabled={inviting || !email.trim()}
            >
              <Send size={14} />
              {inviting ? "Sending..." : "Invite to Portal"}
            </Button>
          </div>
        </div>
      )}

      {magicLink && (
        <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Magic link (expires in 7 days):</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs text-[var(--color-text)] break-all bg-[rgba(0,0,0,0.3)] p-2 rounded">
              {magicLink}
            </code>
            <Button onClick={copyLink} variant="outline" size="sm">
              <Copy size={14} />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </Card>
  );
}
```

**Step 2: Wire into client tabs**

Modify `src/components/clients/client-tabs.tsx` to add a "Portal" tab that renders `<PortalAccessTab client={client} />`. Add it after the existing tabs.

**Step 3: Commit**

```bash
git add src/components/clients/portal-access-tab.tsx src/components/clients/client-tabs.tsx
git commit -m "feat: add Portal Access tab on client detail — invite, revoke, regenerate link"
```

---

## Phase 4: Portal Layout + Branding

### Task 9: Portal Layout with Client Branding

**Files:**
- Create: `src/app/portal/layout.tsx`
- Create: `src/components/portal/portal-header.tsx`
- Create: `src/hooks/use-portal-branding.ts`

**Step 1: Write the branding hook**

`src/hooks/use-portal-branding.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { ClientBranding } from "@/lib/types";
import { PORTAL_DEFAULT_BRANDING } from "@/lib/constants";

export function usePortalBranding() {
  const { clientId } = useUser();
  const [branding, setBranding] = useState<ClientBranding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from("client_branding")
        .select("*")
        .eq("client_id", clientId)
        .single();

      setBranding(data);
      setLoading(false);
    }
    load();
  }, [clientId]);

  const resolved = branding ?? {
    brand_name: PORTAL_DEFAULT_BRANDING.brand_name,
    logo_url: null,
    primary_bg: PORTAL_DEFAULT_BRANDING.primary_bg,
    accent_color: PORTAL_DEFAULT_BRANDING.accent_color,
    text_color: PORTAL_DEFAULT_BRANDING.text_color,
    font_heading: PORTAL_DEFAULT_BRANDING.font_heading,
    font_body: PORTAL_DEFAULT_BRANDING.font_body,
  };

  return { branding: resolved, loading };
}
```

**Step 2: Write the portal header**

`src/components/portal/portal-header.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePortalBranding } from "@/hooks/use-portal-branding";

export function PortalHeader() {
  const { branding } = usePortalBranding();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      className="sticky top-0 z-30 border-b px-6 py-4 flex items-center justify-between"
      style={{
        backgroundColor: branding.primary_bg,
        borderColor: `${branding.text_color}10`,
      }}
    >
      <div className="flex items-center gap-3">
        {branding.logo_url && (
          <img src={branding.logo_url} alt="" className="h-8 w-8 rounded" />
        )}
        <span
          className="text-lg font-bold"
          style={{
            color: branding.text_color,
            fontFamily: branding.font_heading,
          }}
        >
          {branding.brand_name}
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        style={{ color: branding.text_color }}
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </header>
  );
}
```

**Step 3: Write the portal layout**

`src/app/portal/layout.tsx`:

```typescript
import { PortalHeader } from "@/components/portal/portal-header";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <PortalHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/portal/layout.tsx src/components/portal/portal-header.tsx src/hooks/use-portal-branding.ts
git commit -m "feat: add portal layout with client branding — header, logout, CSS variables"
```

---

## Phase 5: Portal Pages

### Task 10: Portal Dashboard — Task Overview

**Files:**
- Create: `src/app/portal/page.tsx`
- Create: `src/components/portal/portal-task-list.tsx`
- Create: `src/app/api/portal/tasks/route.ts`

**Step 1: Write the portal tasks API**

`src/app/api/portal/tasks/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS handles client_id scoping via get_portal_client_ids()
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      id, title, description, status, priority, due_date, completed_at, client_id, created_at,
      clients!tasks_client_id_fkey(name),
      projects!tasks_project_id_fkey(name)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Strip sensitive fields — no assigned_to, created_by
  const safeTasks = (tasks ?? []).map((t: Record<string, unknown>) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    completed_at: t.completed_at,
    client_name: (t.clients as Record<string, string> | null)?.name ?? null,
    project_name: (t.projects as Record<string, string> | null)?.name ?? null,
    created_at: t.created_at,
  }));

  return NextResponse.json({ tasks: safeTasks });
}
```

**Step 2: Write the task list component**

`src/components/portal/portal-task-list.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2, Clock, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { PORTAL_TASK_STATUS_LABELS, PORTAL_TASK_STATUS_COLORS } from "@/lib/constants";
import { usePortalBranding } from "@/hooks/use-portal-branding";

interface PortalTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  client_name: string | null;
  project_name: string | null;
  created_at: string;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  in_progress: Loader2,
  pending: Clock,
  blocked: AlertTriangle,
};

const STATUS_ORDER = ["blocked", "in_progress", "pending", "completed"];

interface PortalTaskListProps {
  tasks: PortalTask[];
}

export function PortalTaskList({ tasks }: PortalTaskListProps) {
  const { branding } = usePortalBranding();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = activeFilter
    ? tasks.filter((t) => t.status === activeFilter)
    : tasks;

  const sorted = [...filtered].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  const counts = STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s).length }),
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter(null)}
          className="px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer"
          style={{
            backgroundColor: !activeFilter ? branding.accent_color : "rgba(255,255,255,0.05)",
            color: !activeFilter ? "#fff" : branding.text_color,
          }}
        >
          All ({tasks.length})
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setActiveFilter(activeFilter === s ? null : s)}
            className="px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer"
            style={{
              backgroundColor: activeFilter === s ? PORTAL_TASK_STATUS_COLORS[s] : "rgba(255,255,255,0.05)",
              color: activeFilter === s ? "#fff" : `${branding.text_color}99`,
            }}
          >
            {PORTAL_TASK_STATUS_LABELS[s]} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Task cards */}
      {sorted.length === 0 ? (
        <EmptyState message="No tasks found" />
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => {
            const Icon = STATUS_ICONS[task.status] ?? Clock;
            return (
              <Link key={task.id} href={`/portal/tasks/${task.id}`}>
                <Card className="p-4 flex items-center gap-4 hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer">
                  <Icon
                    size={20}
                    style={{ color: PORTAL_TASK_STATUS_COLORS[task.status] }}
                    className={task.status === "in_progress" ? "animate-spin" : ""}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.project_name && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {task.project_name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.completed_at && (
                        <span className="text-xs text-green-400">
                          Completed: {new Date(task.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    style={{
                      backgroundColor: `${PORTAL_TASK_STATUS_COLORS[task.status]}20`,
                      color: PORTAL_TASK_STATUS_COLORS[task.status],
                    }}
                  >
                    {PORTAL_TASK_STATUS_LABELS[task.status]}
                  </Badge>
                  <ChevronRight size={16} className="text-[var(--color-text-secondary)]" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Write the portal dashboard page**

`src/app/portal/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { PortalTaskList } from "@/components/portal/portal-task-list";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalBranding } from "@/hooks/use-portal-branding";

export default function PortalDashboard() {
  const { branding } = usePortalBranding();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "resources" | "updates">("tasks");

  useEffect(() => {
    fetch("/api/portal/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: branding.text_color, fontFamily: branding.font_heading }}
        >
          Your Projects
        </h1>
        <p style={{ color: `${branding.text_color}70` }} className="text-sm">
          Track progress, view completed work, and respond to items that need your input.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: `${branding.text_color}10` }}>
        {(["tasks", "resources", "updates"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium transition-all capitalize cursor-pointer"
            style={{
              color: activeTab === tab ? branding.accent_color : `${branding.text_color}60`,
              borderBottom: activeTab === tab ? `2px solid ${branding.accent_color}` : "2px solid transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <PortalTaskList tasks={tasks} />
        )
      )}

      {activeTab === "resources" && (
        <ResourcesTab />
      )}

      {activeTab === "updates" && (
        <UpdatesTab />
      )}
    </div>
  );
}

function ResourcesTab() {
  return <p className="text-[var(--color-text-secondary)] text-sm">Resources coming soon.</p>;
}

function UpdatesTab() {
  return <p className="text-[var(--color-text-secondary)] text-sm">Updates coming soon.</p>;
}
```

**Step 4: Commit**

```bash
git add src/app/portal/page.tsx src/components/portal/portal-task-list.tsx src/app/api/portal/tasks/route.ts
git commit -m "feat: add portal dashboard — task overview with status filters, safe field stripping"
```

---

### Task 11: Portal Task Detail + Client Comments

**Files:**
- Create: `src/app/portal/tasks/[id]/page.tsx`
- Create: `src/components/portal/portal-comments.tsx`
- Create: `src/app/api/portal/tasks/[id]/comments/route.ts`

**Step 1: Write the client comments API**

`src/app/api/portal/tasks/[id]/comments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notify";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: comments, error } = await supabase
    .from("client_comments")
    .select("*, profiles!client_comments_author_id_fkey(name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const safeComments = (comments ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    task_id: c.task_id,
    author_type: c.author_type,
    content: c.content,
    attachments: c.attachments,
    created_at: c.created_at,
    author_name: c.author_type === "admin" ? "Support" : (c.profiles as Record<string, string> | null)?.name ?? "Client",
  }));

  return NextResponse.json({ comments: safeComments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  let body: { content?: string; attachments?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const authorType = profile?.role === "client" ? "client" : "admin";

  const { data: comment, error } = await supabase
    .from("client_comments")
    .insert({
      task_id: taskId,
      author_id: user.id,
      author_type: authorType,
      content: body.content.trim(),
      attachments: body.attachments ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify admin + assigned employee when client comments
  if (authorType === "client") {
    const adminClient = createAdminClient();
    const { data: task } = await adminClient
      .from("tasks")
      .select("assigned_to, title")
      .eq("id", taskId)
      .single();

    // Notify all admins
    const { data: admins } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true);

    const notifyTargets = (admins ?? []).map((a: { id: string }) => a.id);
    if (task?.assigned_to && !notifyTargets.includes(task.assigned_to)) {
      notifyTargets.push(task.assigned_to);
    }

    for (const targetId of notifyTargets) {
      createNotification(
        adminClient,
        targetId,
        `Client comment on "${task?.title ?? "task"}"`,
        body.content.trim().slice(0, 100),
        "client_comment",
        "tasks",
        taskId
      ).catch(console.error);
    }
  }

  return NextResponse.json({ comment }, { status: 201 });
}
```

**Step 2: Write the comments component**

`src/components/portal/portal-comments.tsx`:

```typescript
"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Headphones } from "lucide-react";
import { usePortalBranding } from "@/hooks/use-portal-branding";

interface Comment {
  id: string;
  task_id: string;
  author_type: "client" | "admin";
  author_name: string;
  content: string;
  attachments: unknown[];
  created_at: string;
}

export function PortalComments({ taskId }: { taskId: string }) {
  const { branding } = usePortalBranding();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/portal/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSend() {
    if (!content.trim() || sending) return;
    setSending(true);

    const res = await fetch(`/api/portal/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });

    const data = await res.json();
    if (data.comment) {
      setComments((prev) => [...prev, {
        ...data.comment,
        author_name: "You",
        author_type: "client",
      }]);
      setContent("");
    }
    setSending(false);
  }

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: branding.text_color }}>
        Comments
      </h3>

      <div className="max-h-80 overflow-y-auto space-y-3">
        {loading ? (
          <p className="text-xs" style={{ color: `${branding.text_color}50` }}>Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs" style={{ color: `${branding.text_color}50` }}>
            No comments yet. Ask a question or provide feedback below.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="flex gap-3"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: c.author_type === "admin"
                    ? `${branding.accent_color}20`
                    : "rgba(255,255,255,0.08)",
                }}
              >
                {c.author_type === "admin"
                  ? <Headphones size={14} style={{ color: branding.accent_color }} />
                  : <User size={14} style={{ color: `${branding.text_color}70` }} />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: branding.text_color }}>
                    {c.author_type === "admin" ? "Support" : c.author_name}
                  </span>
                  <span className="text-xs" style={{ color: `${branding.text_color}40` }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: `${branding.text_color}90` }}>
                  {c.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 min-h-[60px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="self-end"
          style={{ backgroundColor: branding.accent_color }}
        >
          <Send size={14} />
        </Button>
      </div>
    </Card>
  );
}
```

**Step 3: Write the task detail page**

`src/app/portal/tasks/[id]/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, AlertTriangle } from "lucide-react";
import { PortalComments } from "@/components/portal/portal-comments";
import { usePortalBranding } from "@/hooks/use-portal-branding";
import { PORTAL_TASK_STATUS_LABELS, PORTAL_TASK_STATUS_COLORS } from "@/lib/constants";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  client_name: string | null;
  project_name: string | null;
}

export default function PortalTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { branding } = usePortalBranding();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/tasks")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.tasks ?? []).find((t: TaskDetail) => t.id === id);
        setTask(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!task) {
    return <p style={{ color: `${branding.text_color}60` }}>Task not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/portal")}
        className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity cursor-pointer"
        style={{ color: branding.accent_color }}
      >
        <ArrowLeft size={16} />
        Back to tasks
      </button>

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: branding.text_color, fontFamily: branding.font_heading }}>
              {task.title}
            </h1>
            {task.project_name && (
              <p className="text-sm mt-1" style={{ color: `${branding.text_color}60` }}>
                {task.project_name}
              </p>
            )}
          </div>
          <Badge
            style={{
              backgroundColor: `${PORTAL_TASK_STATUS_COLORS[task.status]}20`,
              color: PORTAL_TASK_STATUS_COLORS[task.status],
            }}
          >
            {PORTAL_TASK_STATUS_LABELS[task.status]}
          </Badge>
        </div>

        {task.description && (
          <p className="text-sm" style={{ color: `${branding.text_color}80` }}>
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-xs" style={{ color: `${branding.text_color}50` }}>
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Due: {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.completed_at && (
            <span className="text-green-400">
              Completed: {new Date(task.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {task.status === "blocked" && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              color: "#ef4444",
            }}
          >
            <AlertTriangle size={16} />
            This task is blocked and may need your input. Please check the comments below.
          </div>
        )}
      </Card>

      <PortalComments taskId={id} />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/portal/tasks/[id]/page.tsx src/components/portal/portal-comments.tsx src/app/api/portal/tasks/[id]/comments/route.ts
git commit -m "feat: add portal task detail + client comments with admin/employee notifications"
```

---

### Task 12: Portal Resources Tab

**Files:**
- Create: `src/app/api/portal/resources/route.ts`
- Create: `src/components/portal/portal-resources.tsx`
- Modify: `src/app/portal/page.tsx` (replace ResourcesTab placeholder)

**Step 1: Write the portal resources API**

`src/app/api/portal/resources/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS scopes to client's projects
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, description, status, type, deliverable_url, due_date, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: projects ?? [] });
}
```

**Step 2: Write the resources component**

`src/components/portal/portal-resources.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ExternalLink } from "lucide-react";
import { PROJECT_TYPE_LABELS } from "@/lib/constants";
import { usePortalBranding } from "@/hooks/use-portal-branding";

interface PortalProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  type: string;
  deliverable_url: string | null;
  created_at: string;
}

export function PortalResources() {
  const { branding } = usePortalBranding();
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/resources")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (projects.length === 0) {
    return <EmptyState message="No resources available yet" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {projects.map((p) => (
        <Card key={p.id} className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold" style={{ color: branding.text_color }}>
              {p.name}
            </h3>
            <Badge
              className="text-xs"
              style={{ backgroundColor: `${branding.accent_color}20`, color: branding.accent_color }}
            >
              {PROJECT_TYPE_LABELS[p.type] ?? p.type}
            </Badge>
          </div>
          {p.description && (
            <p className="text-xs" style={{ color: `${branding.text_color}60` }}>
              {p.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: `${branding.text_color}40` }}>
              {new Date(p.created_at).toLocaleDateString()}
            </span>
            {p.deliverable_url && (
              <a
                href={p.deliverable_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                style={{ color: branding.accent_color }}
              >
                View <ExternalLink size={12} />
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Update `src/app/portal/page.tsx`**

Replace the `ResourcesTab` placeholder function with an import of `PortalResources`:

```typescript
// Add import at top
import { PortalResources } from "@/components/portal/portal-resources";

// Replace the ResourcesTab function with:
// In the render, change {activeTab === "resources" && <ResourcesTab />}
// to: {activeTab === "resources" && <PortalResources />}
// Delete the placeholder ResourcesTab function
```

**Step 4: Commit**

```bash
git add src/app/api/portal/resources/route.ts src/components/portal/portal-resources.tsx src/app/portal/page.tsx
git commit -m "feat: add portal resources tab — delivered projects with type badges and live URLs"
```

---

### Task 13: Portal Updates Tab

**Files:**
- Create: `src/components/portal/portal-updates.tsx`
- Modify: `src/app/portal/page.tsx` (replace UpdatesTab placeholder)

**Step 1: Write the updates component**

`src/components/portal/portal-updates.tsx`:

Uses the existing notifications API. Client notifications are created when task status changes (already happens in the tasks API) and when admin replies to client comments (Task 11).

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, AlertTriangle, Loader2, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePortalBranding } from "@/hooks/use-portal-branding";

interface Update {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  task_assigned: Clock,
  task_overdue: AlertTriangle,
  task_due_soon: Clock,
  client_comment: MessageSquare,
  comment_reply: MessageSquare,
  system: CheckCircle2,
  info: CheckCircle2,
};

export function PortalUpdates() {
  const { branding } = usePortalBranding();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setUpdates(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  if (updates.length === 0) {
    return <EmptyState message="No updates yet" />;
  }

  return (
    <div className="space-y-2">
      {updates.map((u) => {
        const Icon = TYPE_ICONS[u.type] ?? CheckCircle2;
        return (
          <Card key={u.id} className="p-4 flex items-start gap-3">
            <Icon size={16} style={{ color: branding.accent_color }} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: branding.text_color }}>
                {u.title}
              </p>
              {u.message && (
                <p className="text-xs mt-0.5" style={{ color: `${branding.text_color}60` }}>
                  {u.message}
                </p>
              )}
              <span className="text-xs" style={{ color: `${branding.text_color}30` }}>
                {new Date(u.created_at).toLocaleString()}
              </span>
            </div>
            {!u.is_read && (
              <div
                className="w-2 h-2 rounded-full shrink-0 mt-2"
                style={{ backgroundColor: branding.accent_color }}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

**Step 2: Update `src/app/portal/page.tsx`**

Replace the `UpdatesTab` placeholder with `PortalUpdates` import and render.

**Step 3: Commit**

```bash
git add src/components/portal/portal-updates.tsx src/app/portal/page.tsx
git commit -m "feat: add portal updates tab — notification feed for task status changes"
```

---

## Phase 6: Admin — Client Comment Tab on Tasks

### Task 14: Client Comment Tab in Admin Task View

**Files:**
- Create: `src/components/tasks/client-comments-tab.tsx`
- Modify: `src/components/tasks/task-comments.tsx` (add tab switching between internal and client threads)

**Step 1: Write the client comments tab component**

`src/components/tasks/client-comments-tab.tsx`:

Same as `PortalComments` but with `author_type: "admin"` when the admin posts, and shows the client's actual name instead of "You".

```typescript
"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Crown } from "lucide-react";

interface ClientCommentData {
  id: string;
  author_type: "client" | "admin";
  author_name: string;
  content: string;
  created_at: string;
}

export function ClientCommentsTab({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<ClientCommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/portal/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSend() {
    if (!content.trim() || sending) return;
    setSending(true);

    const res = await fetch(`/api/portal/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });

    const data = await res.json();
    if (data.comment) {
      setComments((prev) => [...prev, {
        ...data.comment,
        author_name: "You (Admin)",
        author_type: "admin",
      }]);
      setContent("");
    }
    setSending(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Client Thread</h4>
        {comments.filter((c) => c.author_type === "client").length > 0 && (
          <Badge variant="danger" className="text-xs">
            {comments.filter((c) => c.author_type === "client").length} client messages
          </Badge>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-xs text-[var(--color-text-secondary)]">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No client messages yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                c.author_type === "client" ? "bg-blue-500/20" : "bg-amber-500/20"
              }`}>
                {c.author_type === "client"
                  ? <User size={12} className="text-blue-400" />
                  : <Crown size={12} className="text-amber-400" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--color-text)]">
                    {c.author_name}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{c.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Reply to client..."
          className="flex-1 min-h-[50px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={!content.trim() || sending} size="sm" className="self-end">
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Modify `src/components/tasks/task-comments.tsx`**

Add a tab bar at the top that toggles between "Internal" (existing task_comments) and "Client" (new ClientCommentsTab). Show a red badge on the Client tab when there are unread client comments.

**Step 3: Commit**

```bash
git add src/components/tasks/client-comments-tab.tsx src/components/tasks/task-comments.tsx
git commit -m "feat: add client comments tab in admin task view — isolated from internal thread"
```

---

## Phase 7: Client Branding Seed

### Task 15: Seed Client Branding from Dev Kits

**Files:**
- Create: `supabase/seeds/client_branding_seed.sql`

**Step 1: Write seed data for known clients**

Extract colors from BRAND_CONTEXT.md files for Prince, Kyle, and others. Clients without dev kits get no row (SUMAIT AI defaults apply).

```sql
-- Prince Andam — from Prince_Dev_Kit/BRAND_CONTEXT.md
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'Prince Andam', '#09090B', '#a855f7', '#ffffff', 'Space Grotesk', 'Inter'
FROM clients WHERE name = 'Prince Andam'
ON CONFLICT (client_id) DO NOTHING;

-- Kyle Painter / Disruptors Media — extract from dev kit
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'Disruptors Media', '#09090B', '#f59e0b', '#ffffff', 'Montserrat', 'Inter'
FROM clients WHERE name = 'Kyle Painter'
ON CONFLICT (client_id) DO NOTHING;

-- CandyPay (sub-client of Prince) — pink theme
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'CandyPay', '#09090B', '#ec4899', '#ffffff', 'Inter', 'Inter'
FROM clients WHERE name ILIKE '%candy%'
ON CONFLICT (client_id) DO NOTHING;

-- All other clients without dev kits will use SUMAIT AI defaults (no row needed)
```

**Step 2: Run in Supabase SQL editor**

**Step 3: Commit**

```bash
git add supabase/seeds/client_branding_seed.sql
git commit -m "feat: seed client branding for Prince, Kyle, CandyPay from dev kits"
```

---

## Phase 8: Final Integration + Deploy

### Task 16: Update Login Page for Magic Link Support

**Files:**
- Modify: `src/app/login/page.tsx`

**Step 1: Ensure login page handles magic link redirects gracefully**

The auth callback already handles magic link tokens. No changes needed to the login page itself — magic links bypass the login form entirely via `/api/auth/callback`.

If the client's magic link expires, they land on `/login?error=auth`. Add a user-friendly message for this case.

**Step 2: Commit if changes were made**

---

### Task 17: Deploy + Verify

**Step 1: Deploy to Vercel**

```bash
cd sumait-command-center
vercel --prod
```

**Step 2: Disable SSO protection**

```bash
bash scripts/vercel-disable-sso.sh
```

**Step 3: Run migration 011 in Supabase SQL editor**

**Step 4: Run branding seed in Supabase SQL editor**

**Step 5: Test the full flow**

1. Log in as admin
2. Go to a client (e.g. Prince Andam)
3. Click "Portal" tab → "Invite to Portal"
4. Copy the magic link
5. Open in incognito browser
6. Verify: lands on `/portal`, sees Prince's tasks only, purple branding applied
7. Click a task → comment on it
8. Back in admin view → check task → Client tab shows the comment
9. Verify Prince can see CandyPay + Sebastian tasks (sub-clients)
10. Verify Kyle cannot see Prince's tasks

**Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "feat: client portal complete — magic link auth, branded portal, isolated comments, resources"
```

---

## Summary

| Phase | Tasks | What It Builds |
|-------|-------|----------------|
| 1 | 1-2 | Database tables + types |
| 2 | 3-5 | Auth middleware + client role routing |
| 3 | 6-8 | Admin invite/manage portal access |
| 4 | 9 | Portal layout with per-client branding |
| 5 | 10-13 | Portal pages (tasks, detail, resources, updates) |
| 6 | 14 | Admin client comment tab on tasks |
| 7 | 15 | Branding seed data |
| 8 | 16-17 | Deploy + verify |

17 tasks total. Each phase can be committed and tested independently.
