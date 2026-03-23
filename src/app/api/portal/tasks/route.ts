import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS handles client_id scoping via get_portal_client_ids()
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_date, completed_at, client_id, created_at, clients!tasks_client_id_fkey(name), projects!tasks_project_id_fkey(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Strip sensitive fields — NO employee names leak to portal
  const safeTasks = (tasks ?? []).map((t: Record<string, unknown>) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    completed_at: t.completed_at,
    client_name:
      (t.clients as Record<string, unknown> | null)?.name ?? null,
    project_name:
      (t.projects as Record<string, unknown> | null)?.name ?? null,
    created_at: t.created_at,
  }));

  return NextResponse.json({ tasks: safeTasks });
}
