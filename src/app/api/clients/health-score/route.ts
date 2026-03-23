import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

interface ScoreResult {
  client_id: string;
  name: string;
  old_score: number;
  new_score: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin only
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const fourteenDaysAgo = new Date(
      now.getTime() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Fetch all active clients
    const { data: clients, error: clientsError } = await admin
      .from("clients")
      .select("id, name, health_score")
      .eq("status", "active");

    if (clientsError) {
      return NextResponse.json(
        { error: clientsError.message },
        { status: 500 }
      );
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ updated: 0, scores: [] });
    }

    const scores: ScoreResult[] = [];

    for (const client of clients) {
      let score = 100;
      const oldScore = client.health_score ?? 100;

      // -5 per overdue task (due_date < now AND status != 'completed')
      const { data: overdueTasks } = await admin
        .from("tasks")
        .select("id")
        .eq("client_id", client.id)
        .lt("due_date", nowIso)
        .neq("status", "completed");

      const overdueCount = overdueTasks?.length ?? 0;
      score -= overdueCount * 5;

      // -10 per blocked task
      const { data: blockedTasks } = await admin
        .from("tasks")
        .select("id")
        .eq("client_id", client.id)
        .eq("status", "blocked");

      const blockedCount = blockedTasks?.length ?? 0;
      score -= blockedCount * 10;

      // -15 if no tasks completed in last 14 days
      const { data: recentCompleted } = await admin
        .from("tasks")
        .select("id")
        .eq("client_id", client.id)
        .eq("status", "completed")
        .gte("updated_at", fourteenDaysAgo)
        .limit(1);

      if (!recentCompleted || recentCompleted.length === 0) {
        score -= 15;
      }

      // -10 if no activity_log entries in last 7 days
      const { data: recentActivity } = await admin
        .from("activity_log")
        .select("id")
        .eq("entity_id", client.id)
        .gte("created_at", sevenDaysAgo)
        .limit(1);

      if (!recentActivity || recentActivity.length === 0) {
        score -= 10;
      }

      // +5 bonus if all tasks completed on time in last 30 days
      const { data: last30Tasks } = await admin
        .from("tasks")
        .select("id, status, due_date, updated_at")
        .eq("client_id", client.id)
        .gte("due_date", thirtyDaysAgo)
        .lte("due_date", nowIso);

      if (last30Tasks && last30Tasks.length > 0) {
        const allOnTime = last30Tasks.every(
          (t) =>
            t.status === "completed" &&
            t.due_date &&
            t.updated_at &&
            new Date(t.updated_at) <= new Date(t.due_date)
        );
        if (allOnTime) {
          score += 5;
        }
      }

      const newScore = clamp(score, 0, 100);

      // Update the client's health_score
      await admin
        .from("clients")
        .update({ health_score: newScore })
        .eq("id", client.id);

      scores.push({
        client_id: client.id,
        name: client.name,
        old_score: oldScore,
        new_score: newScore,
      });
    }

    return NextResponse.json({ updated: scores.length, scores });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Health score calculation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
