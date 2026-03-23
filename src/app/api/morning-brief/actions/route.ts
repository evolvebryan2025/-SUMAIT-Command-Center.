import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
