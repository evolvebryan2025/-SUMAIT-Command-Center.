import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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
