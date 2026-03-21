import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are the SUMAIT Command Center assistant for Bryan Sumait (CEO).
Answer questions about tasks, team, clients, daily reports, and daily operations using ONLY the provided data.
Never fabricate data. If information isn't available, say so.
Be concise and direct. Bryan prefers short answers with bullet points.
When referencing tasks or clients, include their status and any deadlines.`;

// Simple in-memory rate limiter: 20 requests/minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

async function getContextForQuery(supabase: SupabaseClient, query: string): Promise<string> {
  const sections: string[] = [];
  const q = query.toLowerCase();

  // Team / builder queries
  const builderNames = ["lee", "john", "adam", "jamil"];
  const mentionedBuilder = builderNames.find((n) => q.includes(n));
  if (mentionedBuilder || q.includes("team") || q.includes("who") || q.includes("builder") || q.includes("member")) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, role, is_active, email")
      .eq("is_active", true);

    if (profiles && profiles.length > 0) {
      const memberLines: string[] = [];
      for (const p of profiles) {
        if (mentionedBuilder && !p.name.toLowerCase().includes(mentionedBuilder)) continue;

        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, status, priority, due_date")
          .eq("assigned_to", p.id)
          .neq("status", "completed")
          .order("due_date", { ascending: true })
          .limit(10);

        const today = new Date().toISOString().split("T")[0];
        const { data: todayReport } = await supabase
          .from("daily_reports")
          .select("id, report_date")
          .eq("user_id", p.id)
          .eq("report_date", today)
          .maybeSingle();

        const taskSummary = (tasks ?? []).map((t: any) => `  - ${t.title} [${t.status}${t.due_date ? `, due ${t.due_date}` : ""}]`).join("\n");
        memberLines.push(
          `**${p.name}** (${p.role})\n  Active tasks: ${(tasks ?? []).length}\n  Today's report: ${todayReport ? "Submitted" : "Not yet"}\n${taskSummary || "  No active tasks"}`
        );
      }
      sections.push(`## Team\n${memberLines.join("\n\n")}`);
    }
  }

  // Task queries
  if (q.includes("task") || q.includes("overdue") || q.includes("blocked") || q.includes("pending") || q.includes("deadline") || q.includes("work")) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, assigned_to, client_id, profiles:assigned_to(name), clients:client_id(name)")
      .neq("status", "completed")
      .order("due_date", { ascending: true })
      .limit(50);

    if (tasks && tasks.length > 0) {
      const taskLines = tasks.map((t: any) => {
        const assignee = t.profiles?.name ?? "Unassigned";
        const client = t.clients?.name ?? "";
        return `- ${t.title} [${t.status}, ${t.priority}] → ${assignee}${client ? ` (${client})` : ""}${t.due_date ? ` due ${t.due_date}` : ""}`;
      });
      sections.push(`## Active Tasks (${tasks.length})\n${taskLines.join("\n")}`);
    }
  }

  // Client queries
  if (q.includes("client") || q.includes("health") || q.includes("account")) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, company, status, health_score, lifecycle_stage, monthly_value")
      .eq("status", "active")
      .order("health_score", { ascending: true })
      .limit(20);

    if (clients && clients.length > 0) {
      const clientLines = clients.map((c: any) =>
        `- ${c.name}${c.company ? ` (${c.company})` : ""}: health ${c.health_score}/100, ${c.lifecycle_stage}, $${c.monthly_value}/mo`
      );
      sections.push(`## Active Clients (${clients.length})\n${clientLines.join("\n")}`);
    }
  }

  // Report queries
  if (q.includes("report") || q.includes("daily") || q.includes("submitted") || q.includes("missing")) {
    const today = new Date().toISOString().split("T")[0];
    const { data: reports } = await supabase
      .from("daily_reports")
      .select("id, user_id, report_date, profiles:user_id(name), items:daily_report_items(id, item_type, description)")
      .eq("report_date", today);

    if (reports && reports.length > 0) {
      const reportLines = reports.map((r: any) => {
        const items = r.items ?? [];
        const completed = items.filter((i: any) => i.item_type === "completed").length;
        const pending = items.filter((i: any) => i.item_type === "pending").length;
        const blockers = items.filter((i: any) => i.item_type === "blocker").length;
        return `- ${r.profiles?.name ?? "Unknown"}: ${completed} completed, ${pending} pending, ${blockers} blockers`;
      });
      sections.push(`## Today's Reports\n${reportLines.join("\n")}`);
    } else {
      sections.push(`## Today's Reports\nNo reports submitted yet for ${today}.`);
    }
  }

  // Alert queries
  if (q.includes("alert") || q.includes("issue") || q.includes("problem") || q.includes("urgent")) {
    const { data: alerts } = await supabase
      .from("alerts")
      .select("id, type, title, severity, entity_type, created_at")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (alerts && alerts.length > 0) {
      const alertLines = alerts.map((a: any) => `- [${a.severity}] ${a.title} (${a.type})`);
      sections.push(`## Unresolved Alerts (${alerts.length})\n${alertLines.join("\n")}`);
    }
  }

  // Summary / overview queries
  if (q.includes("summary") || q.includes("overview") || q.includes("status") || q.includes("how") || q.includes("what's going on")) {
    const { data: taskCounts } = await supabase.rpc("get_task_counts").maybeSingle();
    const { count: alertCount } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("is_resolved", false);

    const { count: clientCount } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    sections.push(
      `## Quick Summary\n- Active clients: ${clientCount ?? "?"}\n- Unresolved alerts: ${alertCount ?? 0}\n- Task overview: check tasks section for details`
    );
  }

  // If nothing matched, provide a general overview
  if (sections.length === 0) {
    const { count: taskCount } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "completed");
    const { count: alertCount } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("is_resolved", false);

    sections.push(
      `## General Context\n- Open tasks: ${taskCount ?? 0}\n- Unresolved alerts: ${alertCount ?? 0}\n- Ask about specific topics: team, tasks, clients, reports, alerts`
    );
  }

  return sections.join("\n\n").slice(0, 16000);
}

interface MessageInput {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: MessageInput[];
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Auth + admin check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Rate limit exceeded. Max 20 requests per minute." }, { status: 429 });
    }

    const body: RequestBody = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    for (const msg of body.messages) {
      if (typeof msg.content !== "string" || msg.content.length > 2000) {
        return NextResponse.json(
          { error: "Each message content must be a string of 2000 characters or less" },
          { status: 400 }
        );
      }
      if (msg.role !== "user" && msg.role !== "assistant") {
        return NextResponse.json(
          { error: "Message role must be 'user' or 'assistant'" },
          { status: 400 }
        );
      }
    }

    // Get smart context based on the latest user message
    const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
    const context = lastUserMsg
      ? await getContextForQuery(supabase, lastUserMsg.content)
      : "";

    const systemPrompt = context
      ? `${SYSTEM_PROMPT}\n\nCurrent data from Command Center:\n${context}`
      : SYSTEM_PROMPT;

    const anthropic = new Anthropic({ apiKey });

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const readableStream = stream.toReadableStream();

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process chat request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
