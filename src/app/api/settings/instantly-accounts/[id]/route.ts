import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.api_key !== undefined) {
      if (!body.api_key.trim()) {
        return Response.json({ error: "API key cannot be empty" }, { status: 400 });
      }
      updates.api_key = body.api_key.trim();
    }

    if (body.is_default === true) {
      await supabase
        .from("instantly_accounts")
        .update({ is_default: false })
        .eq("is_default", true);
      updates.is_default = true;
    } else if (body.is_default === false) {
      updates.is_default = false;
    }

    const { data, error } = await supabase
      .from("instantly_accounts")
      .update(updates)
      .eq("id", id)
      .select("id, name, email, is_default, created_at, updated_at")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update account";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;

    const { error } = await supabase
      .from("instantly_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete account";
    return Response.json({ error: message }, { status: 500 });
  }
}
