# Phase 5: Security, Audit & Profile Management

## Overview

Phase 5 adds the missing user-facing security and profile management features to the SUMAIT Command Center. The backend foundations (activity logging, auth, profiles table) already exist — this phase builds the UI and API layers on top, plus automated cron-based alerting.

**Scope**: Profile editing, audit log viewer, security/session management, Vercel cron alerts.
**Roles**: Keep existing 2-tier model (admin / member). No new roles or permissions.

---

## 1. Profile Settings Page

**Route**: `/settings/profile`
**Access**: All authenticated users (editing own profile only)

### Features

- **Name editing**: Text input, saves to `profiles.name` via PATCH `/api/profile`
- **Avatar upload**: Upload image to Supabase Storage `avatars` bucket, store public URL in `profiles.avatar_url`
  - Max file size: 2MB
  - Accepted types: image/jpeg, image/png, image/webp
  - File path: `{user_id}/avatar.{ext}` (folder per user, overwrite on re-upload)
  - Delete old avatar file before uploading if extension changes
- **Password change**: Form with current password + new password + confirm
  - Uses `supabase.auth.updateUser({ password })` server-side
  - Validates new password length (min 8 chars)
- **Read-only fields**: Email, role, member since date

### API

**PATCH `/api/profile`**
```json
{
  "name": "string (optional)",
  "avatarUrl": "string (optional)"
}
```
- Auth: authenticated user, updates own profile only
- Returns: `{ profile: Profile }`
- Logs activity: `profile_updated`

**POST `/api/profile/avatar`**
- Multipart form data with `file` field
- Uploads to `avatars` bucket
- Updates `profiles.avatar_url` with public URL
- Returns: `{ url: string }`

**POST `/api/profile/password`**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```
- Auth: authenticated user
- Verifies current password via `supabase.auth.signInWithPassword({ email, password: currentPassword })`
- If verification succeeds, calls `supabase.auth.updateUser({ password: newPassword })`
- Returns: `{ success: true }`
- Returns 400 if current password is incorrect

### Components

- `ProfileSettingsForm` — name + avatar upload + read-only fields
- `PasswordChangeForm` — password change with validation
- `AvatarUpload` — drag-and-drop or click-to-upload with preview

---

## 2. Audit Log Viewer

**Route**: `/settings/audit`
**Access**: Admin only

### Features

- **Filterable table** of `activity_log` entries
- **Filters**:
  - Action type (dropdown): all logged action strings
  - Entity type (dropdown): client, task, employee, credential, knowledge_doc, etc.
  - User (dropdown): list of team members
  - Date range (start/end date pickers)
- **Search**: Free text search across action + entity_type fields
- **Pagination**: Cursor-based (ordered by `created_at DESC, id DESC` for stable results), 50 entries per page, load-more pattern. Cursor is the `activity_log.id` (UUID) of the last item.
- **Display**: Timestamp, user name, action, entity type, entity ID (linked if navigable), metadata preview

### API

**GET `/api/audit`**
```
Query params:
  - action: string (optional filter)
  - entityType: string (optional filter)
  - userId: string (optional filter)
  - startDate: ISO string (optional)
  - endDate: ISO string (optional)
  - search: string (optional free text)
  - cursor: string (optional, last item ID for pagination)
  - limit: number (default 50, max 100)
```
- Auth: admin only
- Returns: `{ logs: ActivityLog[], nextCursor: string | null }`
- Joins `profiles` table to include user name

### Components

- `AuditLogTable` — main table with rows
- `AuditLogFilters` — filter bar with dropdowns + date pickers + search
- `AuditLogRow` — individual entry with expandable metadata

---

## 3. Security Settings Page

**Route**: `/settings/security`
**Access**: All authenticated users

Replaces the "Coming in Phase 4" placeholder card on the settings page.

### Features

- **Password section**: Link/form to change password (same component as profile page)
- **Session management**:
  - "Sign out all devices" button — calls `supabase.auth.signOut({ scope: 'global' })`
  - Shows account creation date
  - Note: Supabase doesn't expose individual session listing via client API
- **Security info panel**:
  - Account created date
  - Last sign-in (from `auth.users.last_sign_in_at` via service role)
  - Role badge
- **Sign out current session**: Button calling `supabase.auth.signOut()`

### API

**POST `/api/auth/sign-out-all`**
- Auth: authenticated user
- Calls `supabase.auth.signOut({ scope: 'global' })` using the user's own session (no admin API needed)
- Returns: `{ success: true }`
- Logs activity: `global_sign_out`

**GET `/api/auth/security-info`**
- Auth: authenticated user
- Returns: `{ lastSignIn: string, createdAt: string, role: string }`
- Uses service-role Supabase client (`createAdminClient()` from `src/lib/supabase/admin.ts`) to read `auth.users` for `last_sign_in_at`

### Components

- `SecurityOverview` — info panel with account dates + role
- `SessionActions` — sign out current / sign out all buttons
- `PasswordChangeForm` — reused from profile page

---

## 4. Vercel Cron for Automated Alerts

**Config**: `vercel.json`
**Endpoint**: Existing `/api/alerts/check`

### Setup

Add to `vercel.json`:
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

### Security

- Vercel cron requests include `x-vercel-cron-secret` header (NOT Authorization Bearer)
- Add `CRON_SECRET` env var on Vercel
- Update `/api/alerts/check` to accept either:
  - Authenticated Supabase user (existing behavior)
  - OR valid `CRON_SECRET` matching `x-vercel-cron-secret` header (for automated runs)
- When running via cron (no user session), use service-role Supabase client (`createAdminClient()`) to bypass RLS — otherwise queries return empty results

### Middleware Bypass

- Update `middleware.ts` to exclude `/api/alerts/check` from auth redirect (cron requests have no cookies)
- Add path to the existing exemption list alongside `/login` and `/api/auth`

### Behavior (already implemented)

- Checks for overdue tasks, sends email notifications to assignees
- Checks for low-health clients, sends alerts
- Uses existing `notify()` dispatcher

---

## 5. Database Changes

### New Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- File path convention: {user_id}/avatar.{ext}
-- storage.foldername extracts the folder segment, which is the user_id

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
```

### New Utility

Create `src/lib/supabase/admin.ts` — a service-role Supabase client for operations that need to bypass RLS or access `auth.users`:

```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

Used by: `/api/auth/security-info`, `/api/alerts/check` (cron mode).

### Audit Log Index

```sql
CREATE INDEX IF NOT EXISTS idx_activity_log_action_entity
  ON activity_log(action, entity_type);
```

Supports the free-text search/filter queries in the audit log viewer.

### RLS Note

The existing `activity_log` RLS policy allows all authenticated users to read. The API restricts the audit viewer to admin-only, but members could theoretically query `activity_log` directly via the Supabase client. This is acceptable — members can see activity relevant to their own work in other views (e.g., activity feed on dashboard). The admin-only API restriction is a UI-level concern, not a data security concern.

No new tables. No schema changes to existing tables.

---

## 6. Settings Page Updates

Update `/settings/page.tsx`:
- Security card: remove "Coming in Phase 4", make it a link to `/settings/security`
- Add Profile card linking to `/settings/profile`
- Add Audit Log card linking to `/settings/audit` (admin only)

---

## 7. File Structure

```
src/
  lib/
    supabase/
      admin.ts                    # Service-role client (bypasses RLS)
  app/
    (dashboard)/
      settings/
        profile/page.tsx          # Profile settings
        security/page.tsx         # Security & sessions
        audit/page.tsx            # Audit log viewer (admin)
    api/
      profile/route.ts            # PATCH profile
      profile/avatar/route.ts     # POST avatar upload
      profile/password/route.ts   # POST password change
      auth/sign-out-all/route.ts  # POST global sign out
      auth/security-info/route.ts # GET security info
      audit/route.ts              # GET audit logs
  components/
    settings/
      profile-settings-form.tsx
      avatar-upload.tsx
      password-change-form.tsx
      security-overview.tsx
      session-actions.tsx
      audit-log-table.tsx
      audit-log-filters.tsx
middleware.ts                     # Updated: add /api/alerts/check to exclusion list
vercel.json                       # Cron config
supabase/migrations/
  004_phase5_avatars_bucket.sql   # Avatar storage bucket + audit index
```

---

## 8. Non-Goals (Phase 6+)

- Email change flow (requires Supabase verification)
- 2FA enrollment UI (Supabase manages separately)
- Role customization / 3rd role
- Team hierarchies or departments
- Per-resource permissions
- Login history / IP tracking
