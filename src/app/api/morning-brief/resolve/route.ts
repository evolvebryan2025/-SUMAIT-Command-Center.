import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { source_type, source_id } = body;

  if (!source_type || !source_id) {
    return NextResponse.json({ error: "source_type and source_id required" }, { status: 400 });
  }

  if (source_type === "alert") {
    const { error } = await supabase
      .from("alerts")
      .update({ is_resolved: true, resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq("id", source_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (source_type === "task") {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", source_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
