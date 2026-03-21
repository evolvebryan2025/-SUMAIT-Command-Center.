import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { data, error } = await supabase
      .from("instantly_accounts")
      .select("id, name, email, is_default, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch accounts";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { name, api_key, email, is_default } = body;

    if (!name?.trim() || !api_key?.trim()) {
      return Response.json({ error: "Name and API key are required" }, { status: 400 });
    }

    // Validate the API key by making a test call
    const testRes = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=1", {
      headers: { Authorization: `Bearer ${api_key.trim()}`, "Content-Type": "application/json" },
    });
    if (!testRes.ok) {
      return Response.json({ error: "Invalid API key — Instantly returned an error" }, { status: 400 });
    }

    // If setting as default, clear existing default first
    if (is_default) {
      await supabase
        .from("instantly_accounts")
        .update({ is_default: false })
        .eq("is_default", true);
    }

    const { data, error } = await supabase
      .from("instantly_accounts")
      .insert({
        name: name.trim(),
        api_key: api_key.trim(),
        email: email?.trim() || null,
        is_default: is_default ?? false,
      })
      .select("id, name, email, is_default, created_at, updated_at")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create account";
    return Response.json({ error: message }, { status: 500 });
  }
}
