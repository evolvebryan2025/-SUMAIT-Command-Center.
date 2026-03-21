import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      assigned_to,
      client_id,
      project_id,
      due_date,
    } = body as Record<string, string | null>;

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const payload = {
      title: String(title).trim(),
      description: description || null,
      status: status ?? "pending",
      priority: priority ?? "medium",
      assigned_to: assigned_to || null,
      client_id: client_id || null,
      project_id: project_id || null,
      due_date: due_date || null,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      created_by: user.id,
    };

    // Self-assignment guard: members can only assign tasks to themselves
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "member") {
      if (payload.assigned_to && payload.assigned_to !== user.id) {
        payload.assigned_to = user.id;
      }
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire notifications in background (don't block response)
    fireTaskNotifications(supabase, data, user.id, "created").catch(
      console.error
    );

    // Log activity
    logActivity(supabase, "task_created", "task", data.id, {
      title: data.title,
      assigned_to: data.assigned_to,
    }).catch(console.error);

    if (profile?.role === "member") {
      logActivity(supabase, "task_created_by_member", "task", data.id, { title: data.title }).catch(console.error);
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body as Record<string, unknown>;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Fetch current task to detect changes
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update payload
    const payload: Record<string, unknown> = {};
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "assigned_to",
      "client_id",
      "project_id",
      "due_date",
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        payload[field] = updates[field] || null;
      }
    }

    if (payload.status === "completed" && currentTask.status !== "completed") {
      payload.completed_at = new Date().toISOString();
    } else if (payload.status && payload.status !== "completed") {
      payload.completed_at = null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Detect assignment change → notify new assignee
    const assignmentChanged =
      "assigned_to" in payload &&
      payload.assigned_to !== currentTask.assigned_to &&
      payload.assigned_to;

    if (assignmentChanged) {
      fireTaskNotifications(supabase, data, user.id, "assigned").catch(
        console.error
      );
    }

    // Detect status change → notify assignee
    if ("status" in payload && payload.status !== currentTask.status) {
      fireTaskNotifications(
        supabase,
        data,
        user.id,
        `status_${payload.status}`
      ).catch(console.error);
    }

    logActivity(supabase, "task_updated", "task", String(id), {
      changes: Object.keys(payload),
    }).catch(console.error);

    return NextResponse.json({ task: data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- Notification helpers ---

async function fireTaskNotifications(
  supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any,
  actorId: string,
  event: string
): Promise<void> {
  // Don't notify the actor about their own actions
  const targetUserId = task.assigned_to;
  if (!targetUserId || targetUserId === actorId) return;

  // Look up assignee profile for email
  const { data: assignee } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", targetUserId)
    .single();

  if (!assignee) return;

  // Look up actor name
  const { data: actor } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", actorId)
    .single();

  const actorName = actor?.name ?? "Someone";

  let title: string;
  let message: string;

  switch (event) {
    case "created":
    case "assigned":
      title = `New task assigned to you`;
      message = `${actorName} assigned you "${task.title}"${task.due_date ? ` — due ${task.due_date}` : ""}.`;
      break;
    case "status_completed":
      title = `Task completed`;
      message = `"${task.title}" has been marked as completed.`;
      break;
    case "status_blocked":
      title = `Task blocked`;
      message = `"${task.title}" has been marked as blocked.`;
      break;
    default:
      title = `Task updated`;
      message = `"${task.title}" was updated by ${actorName}.`;
  }

  await notify({
    supabase,
    userId: targetUserId,
    email: assignee.email,
    title,
    message,
    type: event === "created" || event === "assigned" ? "task_assigned" : "info",
    entityType: "tasks",
    entityId: task.id,
  });
}
