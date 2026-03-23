import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MorningBriefData, BriefAlert, AlertCategory } from "@/lib/types";

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const briefDate = dateParam || new Date().toISOString().split("T")[0];

  // Fetch all data in parallel
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

  // Build alerts
  const briefAlerts: BriefAlert[] = [];
  const today = new Date(briefDate);
  const twoDaysOut = new Date(today);
  twoDaysOut.setDate(twoDaysOut.getDate() + 2);

  // OVERDUE
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

  // DEADLINE
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

  // BLOCKER from tasks
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

  // BLOCKER from daily reports
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

  // MEETING
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

  // STALE
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

  // Sort alerts
  const severityOrder: Record<AlertCategory, number> = {
    OVERDUE: 0, DEADLINE: 1, BLOCKER: 2, MEETING: 3, STALE: 4,
  };
  briefAlerts.sort((a, b) => severityOrder[a.category] - severityOrder[b.category]);

  // Client dashboard
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

  // KPIs
  const kpis = {
    total_clients: clients.length,
    on_track: clientDashboard.filter((c) => c.status === "ON TRACK").length,
    needs_attention: clientDashboard.filter((c) => c.status === "NEEDS ATTENTION").length,
    at_risk: clientDashboard.filter((c) => c.status === "AT RISK").length,
    no_data: clientDashboard.filter((c) => c.status === "NO DATA").length,
  };

  // Meeting insights
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

  // AI recommended actions
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

  // Delegation suggestions
  const unassignedHighPriority = tasks.filter(
    (t) => !t.assigned_to && (t.priority === "high" || t.priority === "urgent")
  );

  const suggestions: MorningBriefData["delegation"]["suggestions"] = unassignedHighPriority.map((task) => {
    const clientMembers = teamMembers.filter((m) => m.role === "member");
    const suggestedMember = clientMembers[0];

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
