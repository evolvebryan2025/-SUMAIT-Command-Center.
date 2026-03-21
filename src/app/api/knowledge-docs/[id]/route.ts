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
    const { title, content, category, isPinned } = body as {
      title?: string;
      content?: string;
      category?: string;
      isPinned?: boolean;
    };

    const payload: Record<string, unknown> = {};
    if (title !== undefined) payload.title = title;
    if (content !== undefined) payload.content = content;
    if (category !== undefined) payload.category = category;
    if (isPinned !== undefined) payload.is_pinned = isPinned;

    const { data, error } = await supabase
      .from("knowledge_docs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "knowledge_doc_updated", "knowledge_doc", id, {
      title: data.title,
    }).catch(console.error);

    return NextResponse.json({ doc: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update doc";
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

    const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "knowledge_doc_deleted", "knowledge_doc", id).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete doc";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
