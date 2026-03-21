import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("client_events")
      .select("*, profiles:created_by(name)")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ events: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { eventType, title, description, metadata } = body as {
      eventType?: string;
      title?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    };

    if (!eventType || !title) {
      return NextResponse.json({ error: "eventType and title are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("client_events")
      .insert({
        client_id: id,
        event_type: eventType,
        title,
        description: description || null,
        metadata: metadata ?? {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
