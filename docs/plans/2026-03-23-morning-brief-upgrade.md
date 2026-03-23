# Morning Brief Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the file-based morning brief with an interactive, database-driven morning brief inside the SUMAIT Command Center — including daily report form enhancements, a new `/morning-brief` route with live DB writes, and GitHub + Vercel CI/CD setup.

**Architecture:** Extend the existing Next.js + Supabase stack. New Supabase migration adds `meeting_note` item type, `client_id` on report items, and a `brief_actions` table. New API route `/api/morning-brief` aggregates daily reports, tasks, alerts, and clients into structured JSON. New React page at `/morning-brief` renders interactive sections with optimistic DB writes. GitHub repo enables auto-deploy to Vercel on push.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (PostgreSQL + RLS), Anthropic Claude API, Tailwind CSS 4, Radix UI, TypeScript 5, Vercel, GitHub

---

## Task 1: GitHub Repo Setup

**Files:**
- Modify: `sumait-command-center/.gitignore` (already exists, verify .env exclusion)
- Create: GitHub repo `sumait-command-center` (private)

**Step 1: Initialize git and make initial commit**

```bash
cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center"
git init
git add .
git commit -m "chore: initial commit — SUMAIT Command Center"
```

**Step 2: Create private GitHub repo and push**

```bash
gh repo create sumait-command-center --private --source=. --push
```

**Step 3: Verify repo exists**

```bash
gh repo view sumait-command-center
```
Expected: Shows repo info with `private: true`

**Step 4: Connect Vercel project to GitHub repo**

```bash
# Link existing Vercel project to the GitHub repo
# This enables auto-deploy on push to main
vercel link
vercel git connect sumait-command-center
```

Note: If `vercel` CLI is not available, connect via Vercel dashboard → Project Settings → Git → Connect GitHub repo.

**Step 5: Commit**

Already committed in Step 1.

---

## Task 2: Database Migration — Schema Extensions

**Files:**
- Create: `supabase/migrations/012_morning_brief.sql`

**Step 1: Write the migration SQL**

```sql
-- 012_morning_brief.sql
-- Extends schema for interactive morning brief

-- 1. Add 'meeting_note' to daily_report_items.item_type
ALTER TABLE public.daily_report_items
  DROP CONSTRAINT IF EXISTS daily_report_items_item_type_check;
ALTER TABLE public.daily_report_items
  ADD CONSTRAINT daily_report_items_item_type_check
  CHECK (item_type IN ('completed', 'pending', 'blocker', 'meeting_note'));

-- 2. Add client_id to daily_report_items (for meeting notes tied to a client)
ALTER TABLE public.daily_report_items
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_report_items_client
  ON public.daily_report_items(client_id);

-- 3. Create brief_actions table (tracks AI-generated recommended actions)
CREATE TABLE IF NOT EXISTS public.brief_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date date NOT NULL,
  action_text text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'task_created')),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brief_actions_date ON public.brief_actions(brief_date);
CREATE INDEX IF NOT EXISTS idx_brief_actions_status ON public.brief_actions(status);

-- 4. RLS for brief_actions
ALTER TABLE public.brief_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to brief_actions"
  ON public.brief_actions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Members read own brief_actions"
  ON public.brief_actions FOR SELECT
  USING (created_by = auth.uid());

-- 5. Add 'delegation_daily' to generated_reports type check if not present
ALTER TABLE public.generated_reports
  DROP CONSTRAINT IF EXISTS generated_reports_type_check;
ALTER TABLE public.generated_reports
  ADD CONSTRAINT generated_reports_type_check
  CHECK (type IN ('morning_brief', 'client_report', 'employee_report', 'team_performance', 'delegation_dashboard', 'delegation_daily'));
```

**Step 2: Apply migration to Supabase**

Run this SQL in the Supabase dashboard SQL editor (Project → SQL Editor → New Query → Paste → Run).

**Step 3: Verify tables and columns exist**

In Supabase SQL editor:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'daily_report_items' AND column_name = 'client_id';

SELECT table_name FROM information_schema.tables
WHERE table_name = 'brief_actions';
```
Expected: Both queries return rows.

**Step 4: Commit**

```bash
git add supabase/migrations/012_morning_brief.sql
git commit -m "feat: add morning brief schema — meeting_note type, client_id, brief_actions table"
```

---

## Task 3: TypeScript Types Update

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add new types**

Add after the existing `DailyReportAttachment` type (around line 304):

```typescript
// Morning Brief types
export type AlertCategory = 'OVERDUE' | 'DEADLINE' | 'BLOCKER' | 'MEETING' | 'STALE';

export interface BriefAlert {
  id: string;
  category: AlertCategory;
  title: string;
  message: string;
  client_name?: string;
  client_id?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source_id?: string;       // task_id or alert_id
  source_type?: 'task' | 'alert' | 'report';
}

export interface BriefAction {
  id: string;
  brief_date: string;
  action_text: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'acknowledged' | 'task_created';
  task_id?: string;
  client_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DelegationSuggestion {
  employee_id: string;
  employee_name: string;
  client_id: string;
  client_name: string;
  task_title: string;
  priority: TaskPriority;
  context: string;
}

export interface MorningBriefData {
  date: string;
  kpis: {
    total_clients: number;
    on_track: number;
    needs_attention: number;
    at_risk: number;
    no_data: number;
  };
  client_dashboard: Array<{
    id: string;
    name: string;
    health_score: number | null;
    status: 'ON TRACK' | 'NEEDS ATTENTION' | 'AT RISK' | 'NO DATA';
    projects: string[];
    completed_today: number;
    pending: number;
    blockers: number;
  }>;
  alerts: BriefAlert[];
  recommended_actions: BriefAction[];
  delegation: {
    status: 'draft';
    suggestions: DelegationSuggestion[];
  };
  meeting_insights: Array<{
    client_name: string;
    summary: string;
    action_items: string[];
    submitted_by: string;
  }>;
}
```

**Step 2: Update DailyReportItem type to include client_id and meeting_note**

Find the `DailyReportItem` interface (around line 263) and update:

```typescript
export interface DailyReportItem {
  id: string;
  report_id: string;
  task_id?: string;
  client_id?: string;                                    // NEW
  item_type: 'completed' | 'pending' | 'blocker' | 'meeting_note';  // UPDATED
  description: string;
  links: string[];
  sort_order: number;
  created_at: string;
  attachments?: DailyReportAttachment[];
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center"
npx tsc --noEmit
```
Expected: No new errors (existing errors may be present).

**Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add MorningBriefData, BriefAlert, BriefAction types"
```

---

## Task 4: Daily Report Form — Add Meeting Notes Section

**Files:**
- Modify: `src/components/daily-reports/report-form.tsx`

**Step 1: Update the sections state to include meeting_note**

In `report-form.tsx`, find the `items` state initialization (around line 60) and the `sections` definition. Add `meeting_note` as a fourth section.

Update the `sections` array used for rendering (find the array that maps section keys to labels, around line 365):

```typescript
const sections: Array<{ key: string; label: string; type: string }> = [
  { key: "completed", label: "Completed", type: "completed" },
  { key: "pending", label: "Pending", type: "pending" },
  { key: "blocker", label: "Blockers", type: "blocker" },
  { key: "meeting_note", label: "Meeting Notes", type: "meeting_note" },
];
```

Update the initial state for `items` to include:
```typescript
meeting_note: []
```

Update the initial state for `collapsed` to include:
```typescript
meeting_note: false
```

**Step 2: Add client selector for meeting note items**

Inside the section rendering loop, when `section.key === "meeting_note"`, render a client dropdown before the description textarea. This requires:

1. Fetch clients list (add to existing `useEffect` or create new one):
```typescript
const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

useEffect(() => {
  fetch("/api/clients")
    .then((r) => r.json())
    .then((data) => setClients(data.clients || []))
    .catch(() => {});
}, []);
```

2. For meeting_note items, add a `<select>` above the description:
```tsx
{section.key === "meeting_note" && (
  <select
    value={item.client_id || ""}
    onChange={(e) => handleUpdateItem(section.key, idx, { ...item, client_id: e.target.value || undefined })}
    className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm mb-2"
  >
    <option value="">Select client...</option>
    {clients.map((c) => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
)}
```

**Step 3: Update handleSubmit to include client_id in items payload**

In `handleSubmit` (around line 243), ensure each item object sent to the API includes `client_id` if present:

```typescript
items: allItems.map((item, idx) => ({
  item_type: item.item_type,
  description: item.description,
  links: item.links || [],
  sort_order: idx,
  task_id: item.task_id || null,
  client_id: item.client_id || null,  // NEW
})),
```

**Step 4: Verify the form renders**

```bash
cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center"
npx next build
```
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/components/daily-reports/report-form.tsx
git commit -m "feat: add meeting notes section to daily report form with client selector"
```

---

## Task 5: Daily Reports API — Support meeting_note and client_id

**Files:**
- Modify: `src/app/api/daily-reports/route.ts`

**Step 1: Update POST handler to accept client_id**

In the POST handler (around line 66), find the items insert loop. Update it to include `client_id`:

```typescript
const { error: itemsError } = await supabase
  .from("daily_report_items")
  .insert(
    items.map((item: any, idx: number) => ({
      report_id: reportId,
      task_id: item.task_id || null,
      client_id: item.client_id || null,    // NEW
      item_type: item.item_type,
      description: item.description,
      links: item.links || [],
      sort_order: item.sort_order ?? idx,
    }))
  );
```

**Step 2: Update GET handler to include client_id in response**

In the GET handler, the select query fetches `daily_report_items(*)`. This automatically includes `client_id` since Supabase returns all columns. No change needed unless the select is explicit — verify and add `client_id` to the select list if columns are explicitly listed.

**Step 3: Verify API works**

```bash
npx tsc --noEmit
```
Expected: No new type errors.

**Step 4: Commit**

```bash
git add src/app/api/daily-reports/route.ts
git commit -m "feat: support meeting_note item type and client_id in daily reports API"
```

---

## Task 6: Morning Brief API Route

**Files:**
- Create: `src/app/api/morning-brief/route.ts`

**Step 1: Create the aggregation API**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MorningBriefData, BriefAlert, AlertCategory } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const briefDate = dateParam || new Date().toISOString().split("T")[0];

  // --- Fetch all data in parallel ---
  const [tasksRes, alertsRes, clientsRes, reportsRes, profilesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, client_id, assigned_to, clients(name), profiles(name)")
      .in("status", ["pending", "in_progress", "blocked"])
      .limit(500),
    supabase
      .from("alerts")
      .select("*")
      .eq("is_resolved", false),
    supabase
      .from("clients")
      .select("id, name, company, health_score, status")
      .eq("status", "active"),
    supabase
      .from("daily_reports")
      .select("id, user_id, report_date, daily_report_items(*, clients(name)), profiles(name)")
      .eq("report_date", briefDate),
    supabase
      .from("profiles")
      .select("id, name, role")
      .eq("is_active", true),
  ]);

  const tasks = tasksRes.data || [];
  const alerts = alertsRes.data || [];
  const clients = clientsRes.data || [];
  const dailyReports = reportsRes.data || [];
  const teamMembers = profilesRes.data || [];

  // --- Build alerts ---
  const briefAlerts: BriefAlert[] = [];
  const today = new Date(briefDate);
  const twoDaysOut = new Date(today);
  twoDaysOut.setDate(twoDaysOut.getDate() + 2);

  // OVERDUE: tasks past due
  for (const task of tasks) {
    if (task.due_date && new Date(task.due_date) < today) {
      briefAlerts.push({
        id: `overdue-${task.id}`,
        category: "OVERDUE",
        title: task.title,
        message: `Due ${task.due_date}, assigned to ${(task as any).profiles?.name || "unassigned"}`,
        client_name: (task as any).clients?.name,
        client_id: task.client_id,
        severity: "critical",
        source_id: task.id,
        source_type: "task",
      });
    }
  }

  // DEADLINE: tasks due within 48h
  for (const task of tasks) {
    if (task.due_date) {
      const due = new Date(task.due_date);
      if (due >= today && due <= twoDaysOut) {
        briefAlerts.push({
          id: `deadline-${task.id}`,
          category: "DEADLINE",
          title: task.title,
          message: `Due ${task.due_date}, assigned to ${(task as any).profiles?.name || "unassigned"}`,
          client_name: (task as any).clients?.name,
          client_id: task.client_id,
          severity: "high",
          source_id: task.id,
          source_type: "task",
        });
      }
    }
  }

  // BLOCKER: blocked tasks + blocker report items
  for (const task of tasks) {
    if (task.status === "blocked") {
      briefAlerts.push({
        id: `blocker-task-${task.id}`,
        category: "BLOCKER",
        title: task.title,
        message: `Blocked — assigned to ${(task as any).profiles?.name || "unassigned"}`,
        client_name: (task as any).clients?.name,
        client_id: task.client_id,
        severity: "high",
        source_id: task.id,
        source_type: "task",
      });
    }
  }

  for (const report of dailyReports) {
    const blockers = ((report as any).daily_report_items || []).filter(
      (i: any) => i.item_type === "blocker"
    );
    for (const b of blockers) {
      briefAlerts.push({
        id: `blocker-report-${b.id}`,
        category: "BLOCKER",
        title: b.description.slice(0, 80),
        message: `Reported by ${(report as any).profiles?.name}`,
        client_name: b.clients?.name,
        client_id: b.client_id,
        severity: "high",
        source_id: b.id,
        source_type: "report",
      });
    }
  }

  // MEETING: action items from meeting notes
  for (const report of dailyReports) {
    const notes = ((report as any).daily_report_items || []).filter(
      (i: any) => i.item_type === "meeting_note"
    );
    for (const n of notes) {
      briefAlerts.push({
        id: `meeting-${n.id}`,
        category: "MEETING",
        title: `Meeting note: ${n.description.slice(0, 60)}`,
        message: `From ${(report as any).profiles?.name}`,
        client_name: n.clients?.name,
        client_id: n.client_id,
        severity: "medium",
        source_id: n.id,
        source_type: "report",
      });
    }
  }

  // STALE: clients with no report in 3+ days
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: recentReports } = await supabase
    .from("daily_report_items")
    .select("client_id, created_at")
    .not("client_id", "is", null)
    .gte("created_at", threeDaysAgo.toISOString());

  const clientsWithRecentReports = new Set(
    (recentReports || []).map((r) => r.client_id)
  );

  for (const client of clients) {
    if (!clientsWithRecentReports.has(client.id)) {
      // Also check if the client has any tasks assigned (not truly stale if no work expected)
      const hasActiveTasks = tasks.some((t) => t.client_id === client.id);
      if (hasActiveTasks) {
        briefAlerts.push({
          id: `stale-${client.id}`,
          category: "STALE",
          title: `No report for ${client.name}`,
          message: "No daily report items mentioning this client in 3+ days",
          client_name: client.name,
          client_id: client.id,
          severity: "low",
          source_type: "alert",
        });
      }
    }
  }

  // Sort alerts by severity
  const severityOrder: Record<AlertCategory, number> = {
    OVERDUE: 0, DEADLINE: 1, BLOCKER: 2, MEETING: 3, STALE: 4,
  };
  briefAlerts.sort((a, b) => severityOrder[a.category] - severityOrder[b.category]);

  // --- Build client dashboard ---
  const clientDashboard = clients.map((client) => {
    const clientTasks = tasks.filter((t) => t.client_id === client.id);
    const clientReportItems = dailyReports.flatMap((r) =>
      ((r as any).daily_report_items || []).filter((i: any) => i.client_id === client.id)
    );

    const completed = clientReportItems.filter((i: any) => i.item_type === "completed").length;
    const pending = clientReportItems.filter((i: any) => i.item_type === "pending").length
      + clientTasks.filter((t) => t.status === "pending").length;
    const blockers = clientReportItems.filter((i: any) => i.item_type === "blocker").length
      + clientTasks.filter((t) => t.status === "blocked").length;

    const hs = client.health_score;
    let status: "ON TRACK" | "NEEDS ATTENTION" | "AT RISK" | "NO DATA" = "NO DATA";
    if (hs !== null && hs !== undefined) {
      if (hs >= 70) status = "ON TRACK";
      else if (hs >= 40) status = "NEEDS ATTENTION";
      else status = "AT RISK";
    }

    // Gather project names from tasks
    const projectNames = [...new Set(clientTasks.map((t) => t.title.split(" — ")[0]))].slice(0, 3);

    return {
      id: client.id,
      name: client.name,
      health_score: client.health_score,
      status,
      projects: projectNames,
      completed_today: completed,
      pending,
      blockers,
    };
  });

  // --- KPIs ---
  const kpis = {
    total_clients: clients.length,
    on_track: clientDashboard.filter((c) => c.status === "ON TRACK").length,
    needs_attention: clientDashboard.filter((c) => c.status === "NEEDS ATTENTION").length,
    at_risk: clientDashboard.filter((c) => c.status === "AT RISK").length,
    no_data: clientDashboard.filter((c) => c.status === "NO DATA").length,
  };

  // --- Meeting insights ---
  const meetingInsights = dailyReports.flatMap((report) => {
    const notes = ((report as any).daily_report_items || []).filter(
      (i: any) => i.item_type === "meeting_note"
    );
    return notes.map((n: any) => ({
      client_name: n.clients?.name || "Unknown",
      summary: n.description,
      action_items: (n.links || []) as string[],
      submitted_by: (report as any).profiles?.name || "Unknown",
    }));
  });

  // --- AI: Generate recommended actions ---
  let recommendedActions: MorningBriefData["recommended_actions"] = [];

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const briefContext = JSON.stringify({
      alerts: briefAlerts.slice(0, 20),
      client_dashboard: clientDashboard,
      meeting_insights: meetingInsights,
    });

    const aiRes = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a business operations assistant for SUMAIT AI, a company managing AI agents for multiple clients. Based on today's morning brief data, generate 5-8 specific, actionable recommended actions. Each action should address a specific alert, client need, or operational improvement.

Data:
${briefContext}

Return ONLY a JSON array of objects with these fields:
- action_text: string (the specific action to take, 1-2 sentences)
- priority: "critical" | "high" | "medium" | "low"
- client_id: string | null (if the action relates to a specific client)

No markdown, no explanation, just the JSON array.`,
        },
      ],
    });

    const aiText = aiRes.content[0].type === "text" ? aiRes.content[0].text : "";
    const parsed = JSON.parse(aiText);

    if (Array.isArray(parsed)) {
      // Save to brief_actions table
      const actionsToInsert = parsed.map((a: any) => ({
        brief_date: briefDate,
        action_text: a.action_text,
        priority: a.priority || "medium",
        status: "pending",
        client_id: a.client_id || null,
        created_by: user.id,
      }));

      const { data: savedActions } = await supabase
        .from("brief_actions")
        .insert(actionsToInsert)
        .select();

      recommendedActions = (savedActions || []).map((a: any) => ({
        id: a.id,
        brief_date: a.brief_date,
        action_text: a.action_text,
        priority: a.priority,
        status: a.status,
        task_id: a.task_id,
        client_id: a.client_id,
        created_by: a.created_by,
        created_at: a.created_at,
        updated_at: a.updated_at,
      }));
    }
  } catch {
    // AI generation failed — brief still works without recommendations
  }

  // --- Build delegation suggestions ---
  // Find high-priority unassigned tasks and suggest assignments
  const unassignedHighPriority = tasks.filter(
    (t) => !t.assigned_to && (t.priority === "high" || t.priority === "urgent")
  );

  const suggestions: MorningBriefData["delegation"]["suggestions"] = unassignedHighPriority.map((task) => {
    // Find a team member assigned to this client (simple round-robin)
    const clientMembers = teamMembers.filter((m) => m.role === "member");
    const suggestedMember = clientMembers[0]; // Will be improved with roster logic

    return {
      employee_id: suggestedMember?.id || "",
      employee_name: suggestedMember?.name || "Unassigned",
      client_id: task.client_id || "",
      client_name: (task as any).clients?.name || "Unknown",
      task_title: task.title,
      priority: task.priority as any,
      context: `${task.status} task, due ${task.due_date || "no date"}`,
    };
  });

  // --- Assemble response ---
  const briefData: MorningBriefData = {
    date: briefDate,
    kpis,
    client_dashboard: clientDashboard,
    alerts: briefAlerts,
    recommended_actions: recommendedActions,
    delegation: {
      status: "draft",
      suggestions,
    },
    meeting_insights: meetingInsights,
  };

  return NextResponse.json(briefData);
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/morning-brief/route.ts
git commit -m "feat: add morning brief aggregation API with alerts, AI actions, delegation"
```

---

## Task 7: Morning Brief Interactive API Routes

**Files:**
- Create: `src/app/api/morning-brief/actions/route.ts`
- Create: `src/app/api/morning-brief/delegate/route.ts`

**Step 1: Create actions endpoint (acknowledge + create task)**

`src/app/api/morning-brief/actions/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH: Update action status (acknowledge or create task)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action_id, status, create_task } = body;

  if (!action_id || !status) {
    return NextResponse.json({ error: "action_id and status required" }, { status: 400 });
  }

  let taskId: string | null = null;

  // Optionally create a task from the action
  if (create_task && status === "task_created") {
    const { data: action } = await supabase
      .from("brief_actions")
      .select("action_text, priority, client_id")
      .eq("id", action_id)
      .single();

    if (action) {
      const { data: task } = await supabase
        .from("tasks")
        .insert({
          title: action.action_text.slice(0, 200),
          status: "pending",
          priority: action.priority,
          client_id: action.client_id,
          created_by: user.id,
        })
        .select("id")
        .single();

      taskId = task?.id || null;
    }
  }

  const { error } = await supabase
    .from("brief_actions")
    .update({
      status,
      task_id: taskId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", action_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, task_id: taskId });
}
```

**Step 2: Create delegation approval endpoint**

`src/app/api/morning-brief/delegate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Approve delegation — creates tasks and assigns them
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { suggestions } = body;

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return NextResponse.json({ error: "suggestions array required" }, { status: 400 });
  }

  const tasksToInsert = suggestions.map((s: any) => ({
    title: s.task_title,
    status: "pending",
    priority: s.priority || "medium",
    assigned_to: s.employee_id || null,
    client_id: s.client_id || null,
    created_by: user.id,
  }));

  const { data: created, error } = await supabase
    .from("tasks")
    .insert(tasksToInsert)
    .select("id, title, assigned_to");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tasks_created: created?.length || 0, tasks: created });
}
```

**Step 3: Create alert resolution endpoint**

Add to the existing alerts infrastructure. Create `src/app/api/morning-brief/resolve/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH: Resolve an alert or mark a task as no longer blocked
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { source_type, source_id } = body;

  if (!source_type || !source_id) {
    return NextResponse.json({ error: "source_type and source_id required" }, { status: 400 });
  }

  if (source_type === "alert") {
    const { error } = await supabase
      .from("alerts")
      .update({ is_resolved: true, resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq("id", source_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (source_type === "task") {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", source_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/api/morning-brief/
git commit -m "feat: add morning brief interactive APIs — actions, delegation, alert resolution"
```

---

## Task 8: Morning Brief Page — Layout & KPI Cards

**Files:**
- Create: `src/app/(dashboard)/morning-brief/page.tsx`
- Create: `src/components/morning-brief/brief-header.tsx`
- Create: `src/components/morning-brief/kpi-cards.tsx`

**Step 1: Create the page shell**

`src/app/(dashboard)/morning-brief/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { MorningBriefData } from "@/lib/types";
import { BriefHeader } from "@/components/morning-brief/brief-header";
import { KpiCards } from "@/components/morning-brief/kpi-cards";
import { ClientDashboard } from "@/components/morning-brief/client-dashboard";
import { AlertsSection } from "@/components/morning-brief/alerts-section";
import { RecommendedActions } from "@/components/morning-brief/recommended-actions";
import { DelegationDraft } from "@/components/morning-brief/delegation-draft";

export default function MorningBriefPage() {
  const { profile, loading: userLoading, isAdmin } = useUser();
  const [brief, setBrief] = useState<MorningBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/morning-brief?date=${selectedDate}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load brief");
      }
      const data = await res.json();
      setBrief(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!userLoading && profile) fetchBrief();
  }, [userLoading, profile, fetchBrief]);

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)]">
        Morning Brief is available to admins only.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BriefHeader
        date={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={fetchBrief}
        loading={loading}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {brief && (
        <>
          <KpiCards kpis={brief.kpis} />
          <ClientDashboard clients={brief.client_dashboard} />
          <AlertsSection alerts={brief.alerts} onResolve={fetchBrief} />
          <RecommendedActions actions={brief.recommended_actions} onUpdate={fetchBrief} />
          <DelegationDraft delegation={brief.delegation} onApprove={fetchBrief} />
        </>
      )}
    </div>
  );
}
```

**Step 2: Create BriefHeader component**

`src/components/morning-brief/brief-header.tsx`:

```tsx
"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BriefHeaderProps {
  date: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function BriefHeader({ date, onDateChange, onRefresh, loading }: BriefHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
          Morning Brief
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Daily overview of operations, tasks, and alerts
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm"
        />
        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Create KpiCards component**

`src/components/morning-brief/kpi-cards.tsx`:

```tsx
"use client";

import type { MorningBriefData } from "@/lib/types";

interface KpiCardsProps {
  kpis: MorningBriefData["kpis"];
}

const cards = [
  { key: "total_clients", label: "Total Clients", color: "var(--color-primary)" },
  { key: "on_track", label: "On Track", color: "#22c55e" },
  { key: "needs_attention", label: "Needs Attention", color: "#f59e0b" },
  { key: "at_risk", label: "At Risk", color: "#ef4444" },
  { key: "no_data", label: "No Data", color: "#6b7280" },
] as const;

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(({ key, label, color }) => (
        <div
          key={key}
          className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
        >
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>
            {kpis[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```
Expected: Will fail because ClientDashboard, AlertsSection, RecommendedActions, DelegationDraft don't exist yet. That's OK — we create them in the next tasks.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/morning-brief/ src/components/morning-brief/
git commit -m "feat: morning brief page shell with header and KPI cards"
```

---

## Task 9: Morning Brief — Client Dashboard Component

**Files:**
- Create: `src/components/morning-brief/client-dashboard.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MorningBriefData } from "@/lib/types";

interface ClientDashboardProps {
  clients: MorningBriefData["client_dashboard"];
}

const statusColors: Record<string, string> = {
  "ON TRACK": "#22c55e",
  "NEEDS ATTENTION": "#f59e0b",
  "AT RISK": "#ef4444",
  "NO DATA": "#6b7280",
};

export function ClientDashboard({ clients }: ClientDashboardProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
          Client Dashboard
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <th className="text-left px-4 py-2 font-medium w-8"></th>
              <th className="text-left px-4 py-2 font-medium">Client</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Health</th>
              <th className="text-center px-4 py-2 font-medium">Done</th>
              <th className="text-center px-4 py-2 font-medium">Pending</th>
              <th className="text-center px-4 py-2 font-medium">Blockers</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <>
                <tr
                  key={client.id}
                  className="border-b border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                  onClick={() => toggle(client.id)}
                >
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {expanded.has(client.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)] font-medium">{client.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        color: statusColors[client.status],
                        backgroundColor: `${statusColors[client.status]}15`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: statusColors[client.status] }}
                      />
                      {client.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${client.health_score ?? 0}%`,
                            backgroundColor: statusColors[client.status],
                          }}
                        />
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {client.health_score ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-green-400">{client.completed_today}</td>
                  <td className="px-4 py-3 text-center text-yellow-400">{client.pending}</td>
                  <td className="px-4 py-3 text-center text-red-400">{client.blockers}</td>
                </tr>
                {expanded.has(client.id) && (
                  <tr key={`${client.id}-detail`}>
                    <td colSpan={7} className="px-8 py-3 bg-[rgba(255,255,255,0.02)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Projects: {client.projects.length > 0 ? client.projects.join(", ") : "None tracked"}
                      </p>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No active clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/morning-brief/client-dashboard.tsx
git commit -m "feat: client dashboard table with expandable rows and health bars"
```

---

## Task 10: Morning Brief — Alerts Section

**Files:**
- Create: `src/components/morning-brief/alerts-section.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import type { BriefAlert, AlertCategory } from "@/lib/types";

interface AlertsSectionProps {
  alerts: BriefAlert[];
  onResolve: () => void;
}

const categoryStyles: Record<AlertCategory, { bg: string; text: string; label: string }> = {
  OVERDUE: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "OVERDUE" },
  DEADLINE: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", label: "DEADLINE" },
  BLOCKER: { bg: "rgba(249,115,22,0.12)", text: "#f97316", label: "BLOCKER" },
  MEETING: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", label: "MEETING" },
  STALE: { bg: "rgba(107,114,128,0.12)", text: "#6b7280", label: "STALE" },
};

export function AlertsSection({ alerts, onResolve }: AlertsSectionProps) {
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const handleResolve = async (alert: BriefAlert) => {
    if (!alert.source_id || !alert.source_type) return;

    setResolving((prev) => new Set(prev).add(alert.id));

    try {
      const res = await fetch("/api/morning-brief/resolve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: alert.source_type,
          source_id: alert.source_id,
        }),
      });
      if (res.ok) onResolve();
    } catch {
      // Revert on failure
    } finally {
      setResolving((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
          Alerts ({alerts.length})
        </h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {alerts.map((alert) => {
          const style = categoryStyles[alert.category];
          const isResolving = resolving.has(alert.id);

          return (
            <div
              key={alert.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)]"
            >
              <input
                type="checkbox"
                checked={isResolving}
                onChange={() => handleResolve(alert)}
                disabled={isResolving || !alert.source_id}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
              />
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {style.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)] truncate">{alert.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{alert.message}</p>
              </div>
              {alert.client_name && (
                <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
                  {alert.client_name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/morning-brief/alerts-section.tsx
git commit -m "feat: interactive alerts section with resolve-on-check DB writes"
```

---

## Task 11: Morning Brief — Recommended Actions

**Files:**
- Create: `src/components/morning-brief/recommended-actions.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BriefAction } from "@/lib/types";

interface RecommendedActionsProps {
  actions: BriefAction[];
  onUpdate: () => void;
}

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

export function RecommendedActions({ actions, onUpdate }: RecommendedActionsProps) {
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const handleAction = async (action: BriefAction, createTask: boolean) => {
    setUpdating((prev) => new Set(prev).add(action.id));

    try {
      const res = await fetch("/api/morning-brief/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: action.id,
          status: createTask ? "task_created" : "acknowledged",
          create_task: createTask,
        }),
      });
      if (res.ok) onUpdate();
    } catch {
      // Revert on failure
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  };

  if (actions.length === 0) return null;

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
          Recommended Actions
        </h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {actions.map((action, idx) => {
          const isUpdating = updating.has(action.id);
          const isDone = action.status !== "pending";

          return (
            <div
              key={action.id}
              className={`flex items-start gap-3 px-4 py-3 ${isDone ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => handleAction(action, false)}
                disabled={isUpdating || isDone}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer mt-0.5"
              />
              <span className="text-sm text-[var(--color-text-secondary)] font-mono shrink-0">
                {idx + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-[var(--color-text)] ${isDone ? "line-through" : ""}`}>
                  {action.action_text}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0"
                style={{
                  color: priorityColors[action.priority],
                  backgroundColor: `${priorityColors[action.priority]}15`,
                }}
              >
                {action.priority}
              </span>
              {!isDone && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAction(action, true)}
                  disabled={isUpdating}
                  className="shrink-0"
                >
                  <Plus size={12} />
                  Task
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/morning-brief/recommended-actions.tsx
git commit -m "feat: recommended actions with acknowledge and create-task buttons"
```

---

## Task 12: Morning Brief — Delegation Draft

**Files:**
- Create: `src/components/morning-brief/delegation-draft.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MorningBriefData, DelegationSuggestion } from "@/lib/types";

interface DelegationDraftProps {
  delegation: MorningBriefData["delegation"];
  onApprove: () => void;
}

const priorityColors: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

export function DelegationDraft({ delegation, onApprove }: DelegationDraftProps) {
  const [approving, setApproving] = useState(false);
  const [approvedEmployees, setApprovedEmployees] = useState<Set<string>>(new Set());

  // Group by employee
  const grouped = delegation.suggestions.reduce<Record<string, DelegationSuggestion[]>>(
    (acc, s) => {
      const key = s.employee_id || "unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    },
    {}
  );

  const handleApproveEmployee = async (employeeId: string, suggestions: DelegationSuggestion[]) => {
    setApproving(true);
    try {
      const res = await fetch("/api/morning-brief/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions }),
      });
      if (res.ok) {
        setApprovedEmployees((prev) => new Set(prev).add(employeeId));
        onApprove();
      }
    } catch {
      // Handle error
    } finally {
      setApproving(false);
    }
  };

  const handleApproveAll = async () => {
    setApproving(true);
    try {
      const res = await fetch("/api/morning-brief/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: delegation.suggestions }),
      });
      if (res.ok) {
        const allIds = new Set(Object.keys(grouped));
        setApprovedEmployees(allIds);
        onApprove();
      }
    } catch {
      // Handle error
    } finally {
      setApproving(false);
    }
  };

  if (delegation.suggestions.length === 0) return null;

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)] font-[var(--font-heading)]">
            Task Delegation
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 uppercase tracking-wider">
            DRAFT — Requires Approval
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleApproveAll}
          disabled={approving}
        >
          {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Approve All
        </Button>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {Object.entries(grouped).map(([employeeId, suggestions]) => {
          const isApproved = approvedEmployees.has(employeeId);
          const employeeName = suggestions[0]?.employee_name || "Unassigned";

          return (
            <div key={employeeId} className={isApproved ? "opacity-50" : ""}>
              <div className="px-4 py-2 flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {employeeName}
                </span>
                {!isApproved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleApproveEmployee(employeeId, suggestions)}
                    disabled={approving}
                  >
                    Approve
                  </Button>
                )}
                {isApproved && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Approved
                  </span>
                )}
              </div>
              <div className="px-6 py-2 space-y-2">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{
                        color: priorityColors[s.priority] || "#6b7280",
                        backgroundColor: `${priorityColors[s.priority] || "#6b7280"}15`,
                      }}
                    >
                      {s.priority}
                    </span>
                    <span className="text-[var(--color-text)]">{s.task_title}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      — {s.client_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/morning-brief/delegation-draft.tsx
git commit -m "feat: delegation draft with per-employee and approve-all buttons"
```

---

## Task 13: Add Morning Brief to Sidebar Navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add nav item**

In the `navItems` array (around line 12), add the Morning Brief entry after Dashboard:

```typescript
const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Morning Brief", href: "/morning-brief", icon: Sunrise, adminOnly: true },
  // ... rest of items
];
```

Add `Sunrise` to the lucide-react import at the top of the file:

```typescript
import { LayoutDashboard, Sunrise, Users, UserCog, FileText, Settings, LogOut, CheckSquare, Mail, CalendarDays, ClipboardList, HelpCircle, Library, TrendingUp } from "lucide-react";
```

**Step 2: Verify build**

```bash
cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center"
npx next build
```
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Morning Brief to sidebar navigation (admin only)"
```

---

## Task 14: Final Build Verification & Push

**Step 1: Run full build**

```bash
cd "c:/Users/User/Downloads/SUMAIT AI AGENTS/sumait-command-center"
npx next build
```
Expected: Build succeeds with no errors.

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No new errors.

**Step 3: Push to GitHub**

```bash
git push origin main
```
Expected: Vercel auto-deploys from the push.

**Step 4: Verify Vercel deployment**

Check the Vercel dashboard or run:
```bash
vercel ls
```
Expected: New deployment in progress or complete.

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | GitHub repo setup | `.gitignore`, GitHub repo |
| 2 | DB migration | `supabase/migrations/012_morning_brief.sql` |
| 3 | TypeScript types | `src/lib/types.ts` |
| 4 | Daily report form + meeting notes | `src/components/daily-reports/report-form.tsx` |
| 5 | Daily reports API update | `src/app/api/daily-reports/route.ts` |
| 6 | Morning brief aggregation API | `src/app/api/morning-brief/route.ts` |
| 7 | Interactive API routes (actions, delegate, resolve) | `src/app/api/morning-brief/actions/route.ts`, `delegate/route.ts`, `resolve/route.ts` |
| 8 | Page shell + header + KPI cards | `src/app/(dashboard)/morning-brief/page.tsx`, `brief-header.tsx`, `kpi-cards.tsx` |
| 9 | Client dashboard component | `src/components/morning-brief/client-dashboard.tsx` |
| 10 | Alerts section | `src/components/morning-brief/alerts-section.tsx` |
| 11 | Recommended actions | `src/components/morning-brief/recommended-actions.tsx` |
| 12 | Delegation draft | `src/components/morning-brief/delegation-draft.tsx` |
| 13 | Sidebar nav update | `src/components/layout/sidebar.tsx` |
| 14 | Final build + push | Verify & deploy |
