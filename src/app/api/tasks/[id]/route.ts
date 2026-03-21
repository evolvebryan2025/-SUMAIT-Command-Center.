import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
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

    const payload: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        payload[field] = (body as Record<string, unknown>)[field] || null;
      }
    }

    if (payload.status === "completed") {
      payload.completed_at = new Date().toISOString();
    } else if (payload.status) {
      payload.completed_at = null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "task_updated", "task", id, {
      changes: Object.keys(payload),
    }).catch(console.error);

    return NextResponse.json({ task: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "task_deleted", "task", id).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
