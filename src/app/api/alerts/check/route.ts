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
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];
    const created: string[] = [];

    // 1. Overdue tasks
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, assigned_to")
      .lt("due_date", today)
      .neq("status", "completed")
      .limit(100);

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
      .neq("status", "completed")
      .limit(100);

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

    // 3. Low health clients
    const { data: unhealthyClients } = await supabase
      .from("clients")
      .select("id, name, health_score")
      .lt("health_score", 40)
      .eq("status", "active")
      .limit(100);

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
