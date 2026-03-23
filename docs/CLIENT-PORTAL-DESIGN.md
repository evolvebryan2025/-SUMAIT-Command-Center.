# Client Portal — Design Document

> Approved: 2026-03-23
> Status: Ready for implementation

---

## 1. Overview

A client-facing portal within the SUMAIT Command Center where clients can view their task progress, comment on tasks, respond to blockers, and access their delivered resources. Branded per client using their dev kit.

### Purpose

Clients need visibility into what's being done for them without manual status updates from Bryan.

### Target Users

Active SUMAIT clients (under 20), accessed via magic link with 7-day expiry.

### Non-Goals

- Clients cannot see employees, team structure, or any indication Bryan has a team
- Clients cannot see other clients' data (exception: parent clients see sub-client tasks)
- Clients cannot edit tasks, change statuses, or manage anything — interaction is limited to comments and blocker responses
- No email/webhook notifications (in-app only)

---

## 2. Authentication

### New Role

Add `client` to the existing role enum: `admin | member | lead | client`

### Magic Link Flow

1. Admin opens a client's page in Command Center, clicks "Invite to Portal"
2. System creates a Supabase Auth account for the client's email (if not exists)
3. Profile created with `role: client`, linked to the client record via `client_portal_access`
4. Supabase sends a magic link email (7-day expiry)
5. Client clicks link, middleware detects `role: client`, routes to `/portal`
6. Any attempt to access admin/builder routes redirects to `/portal`

### Admin Controls

- Invite to Portal button (on client detail page)
- Active/Revoked toggle per client
- Last Accessed timestamp
- Regenerate Link button (fresh 7-day magic link)

---

## 3. Data Model

### 3.1 New Table: `client_portal_access`

Links a Supabase Auth user to a client record.

```sql
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
```

### 3.2 New Table: `client_comments`

Completely separate from internal `task_comments`. Two isolated threads per task.

```sql
CREATE TABLE client_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('client', 'admin')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 New Table: `client_branding`

Dev kit tokens per client for portal theming.

```sql
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
  extra_tokens JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Default fallback (no row): SUMAIT AI branding.

### 3.4 Role Enum Update

Add `client` to profile role check constraint.

### 3.5 Unchanged Tables

`tasks`, `task_comments`, `projects`, `clients` — no modifications.

---

## 4. Row-Level Security

### Client role policies

| Table | Operation | Rule |
|-------|-----------|------|
| `tasks` | SELECT | `client_id` = own client OR `client_id` in sub-clients (via `parent_client_id`) |
| `client_comments` | SELECT | On tasks the client can see |
| `client_comments` | INSERT | On tasks the client can see, `author_id` = self, `author_type` = 'client' |
| `projects` | SELECT | Same sub-client logic as tasks |
| `client_branding` | SELECT | Own client only |
| `client_portal_access` | SELECT | Own record only |
| Everything else | ALL | No access |

### Sub-client visibility logic

```sql
-- Helper function
CREATE FUNCTION get_client_ids_for_portal(p_client_id UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM clients
  WHERE id = p_client_id OR parent_client_id = p_client_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

- Prince (parent) sees: Prince + CandyPay + Sebastian tasks
- CandyPay (sub-client) sees: CandyPay tasks only
- Sebastian (sub-client) sees: Sebastian tasks only
- No sideways visibility between unrelated clients

---

## 5. Portal UI

### Layout

Minimal. No sidebar. Top bar with client's logo and brand name. Three tabs.

All text uses passive voice. No employee names, no "assigned to", no team references.

### Tab 1: Tasks (default)

List view grouped by status:

| Status | Badge Color | Extra Info |
|--------|-------------|------------|
| Completed | Green | Completion date |
| In Progress | Blue | — |
| Pending | Gray | Due date |
| Blocked | Red | Blocker reason + "Respond" button |

Each task shows: title, description, status, due date, project name.

Task detail view (click to open):
- Task info (title, description, status, due date, project)
- Client comment thread (isolated from internal)
- File upload area for blocker responses

### Tab 2: Resources

Grid of delivered projects. Each card:
- Project name
- Type badge (deliverable, presentation, tool, report, brand_kit)
- Deploy date
- Link to live URL

### Tab 3: Updates

Chronological notification feed:
- "Task X was marked complete"
- "Task Y is now in progress"
- "Task Z is blocked — your input needed"

All passive voice. No names. Status changes on their tasks only.

### Branding

CSS variables loaded from `client_branding` table at page load:
- `--portal-bg`: primary background
- `--portal-accent`: accent color (buttons, badges, links)
- `--portal-text`: text color
- `--portal-font-heading`: heading font
- `--portal-font-body`: body font

Falls back to SUMAIT AI defaults if no `client_branding` row exists.

---

## 6. Admin View Additions

### Client Detail Page

New "Portal Access" section:
- Invite to Portal button
- Active/Revoked toggle
- Last Accessed timestamp
- Regenerate Link button

### Task Detail Page

Two comment tabs:
- **Internal** — existing `task_comments` (admin + employees only, unchanged)
- **Client** — `client_comments` (visible to admin + assigned employee + client)

Red unread badge on Client tab when new client comments exist.

---

## 7. Notifications (In-App Only)

| Event | Who Gets Notified |
|-------|-------------------|
| Client comments on a task | Admin + assigned employee |
| Client responds to a blocker | Admin + assigned employee |
| Task status changes | Client (in Updates tab) |
| Task marked blocked | Client (in Updates tab with "your input needed") |

---

## 8. Dashboard Sync

The standalone Task Delegation Dashboard (`Employees/dashboard/index.html` at sumait-task-delegation.vercel.app) is retired.

- Employees use the Command Center builder dashboard (already built)
- Tasks are created once in the Command Center, visible to employee (builder view) and client (portal view)
- One source of truth: Supabase

### Flow

```
Admin creates task → assigns to employee + links to client
       |                          |
       v                          v
  Employee sees in           Client sees in
  Builder Dashboard          Client Portal
  (internal comments)        (client comments)
       |                          |
       v                          v
  Employee updates    →    Client sees change
  status                   in real-time
```

---

## 9. Decision Log

| # | Decision | Alternatives | Why |
|---|----------|-------------|-----|
| 1 | Magic link (7-day expiry) | Password, secret URL | Low friction, secure, expirable |
| 2 | Client role in existing app | Separate app, token pages | Single codebase, reuses auth + RLS |
| 3 | Two separate comment threads | Single thread with flag | Zero leak risk |
| 4 | Per-client branding | Universal design | Feels like their own product |
| 5 | Parent sees sub-client tasks | Flat isolation | Matches Prince/CandyPay/Sebastian |
| 6 | Read + comment + blocker response | Read-only, full edit | Unblocks work without over-access |
| 7 | In-app notifications only | Email, webhooks | Simple, under 20 users |
| 8 | Retire static dashboard | Sync via API | One source of truth |
| 9 | Resources tab | No resources | Natural to surface deliverables |
| 10 | Passive voice everywhere | Generic roles | Employees stay invisible |

---

## 10. Assumptions

- Magic links sent manually by admin (not automated onboarding)
- Client portal access is one email per client (not multiple users per client)
- Blocker responses from clients don't auto-change task status (admin/employee manages that)
- Dev kit branding is populated once by admin from BRAND_CONTEXT.md files
- Under 20 concurrent client users (no scale optimization needed)

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| RLS misconfiguration leaks other clients' data | Integration tests for cross-client isolation |
| Internal comments accidentally exposed | Separate tables (not a flag), no shared queries |
| Employee names in task descriptions | Admin discipline + portal renders only safe fields |
| Magic link forwarded to unauthorized person | 7-day expiry + revoke toggle |
| Client branding not configured | SUMAIT AI fallback is clean default |
