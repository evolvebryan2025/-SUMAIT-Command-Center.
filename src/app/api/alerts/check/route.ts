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

    // 4. Due-soon tasks (due tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: dueSoonTasks } = await supabase
      .from("tasks")
      .select("id, title, assigned_to")
      .eq("due_date", tomorrowStr)
      .neq("status", "completed")
      .limit(100);

    for (const task of dueSoonTasks || []) {
      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("entity_type", "task")
        .eq("entity_id", task.id)
        .eq("type", "task_overdue")
        .eq("severity", "medium")
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existing) {
        await supabase.from("alerts").insert({
          type: "task_overdue",
          title: `Due tomorrow: ${task.title}`,
          message: `Task "${task.title}" is due tomorrow`,
          severity: "medium",
          entity_type: "task",
          entity_id: task.id,
        });
        created.push(`due_soon:${task.id}`);

        if (task.assigned_to) {
          notify({
            supabase, userId: task.assigned_to, title: `Due tomorrow: ${task.title}`,
            message: `Your task "${task.title}" is due tomorrow.`,
            type: "task_due_soon" as any, entityType: "tasks", entityId: task.id,
            channels: ["in_app"],
          }).catch(console.error);
        }
      }
    }

    // 5. Daily report missing check (after 18:00 PHT = 10:00 UTC, weekdays only)
    const nowUtc = new Date();
    const phHour = (nowUtc.getUTCHours() + 8) % 24;
    const phDay = new Date(nowUtc.getTime() + 8 * 60 * 60 * 1000).getUTCDay();
    const isWeekday = phDay >= 1 && phDay <= 5;

    if (phHour >= 18 && isWeekday) {
      const phtDate = new Date(nowUtc.getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data: members } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "member")
        .eq("is_active", true);

      for (const member of members || []) {
        const { data: report } = await supabase
          .from("daily_reports")
          .select("id")
          .eq("user_id", member.id)
          .eq("report_date", phtDate)
          .maybeSingle();

        if (!report) {
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", member.id)
            .eq("type", "daily_report_missing")
            .gte("created_at", today + "T00:00:00")
            .maybeSingle();

          if (!existingNotif) {
            notify({
              supabase, userId: member.id,
              title: "Daily report missing",
              message: `You haven't submitted your daily report for ${phtDate}.`,
              type: "daily_report_missing" as any, channels: ["in_app"],
            }).catch(console.error);

            const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin").eq("is_active", true);
            for (const admin of admins || []) {
              notify({
                supabase, userId: admin.id,
                title: `Missing report: ${member.name}`,
                message: `${member.name} hasn't submitted their daily report for ${phtDate}.`,
                type: "daily_report_missing" as any, channels: ["in_app"],
              }).catch(console.error);
            }
            created.push(`missing_report:${member.id}`);
          }
        }
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
