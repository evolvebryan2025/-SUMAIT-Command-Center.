import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = request.nextUrl.searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("knowledge_docs")
      .select("*, knowledge_attachments(*)")
      .eq("client_id", clientId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ docs: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch docs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { clientId, title, content, category, isPinned } = body as {
      clientId?: string;
      title?: string;
      content?: string;
      category?: string;
      isPinned?: boolean;
    };

    if (!clientId || !title) {
      return NextResponse.json({ error: "clientId and title are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("knowledge_docs")
      .insert({
        client_id: clientId,
        title,
        content: content ?? "",
        category: category ?? "general",
        is_pinned: isPinned ?? false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "knowledge_doc_created", "knowledge_doc", data.id, {
      title,
      client_id: clientId,
    }).catch(console.error);

    return NextResponse.json({ doc: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create doc";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
