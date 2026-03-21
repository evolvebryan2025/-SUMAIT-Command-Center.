import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/encryption";
import { logActivity } from "@/lib/activity-logger";
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Decrypt the actual value (for "reveal" action)
    const decryptedValue = await decrypt(data.encrypted_value);

    logActivity(supabase, "credential_revealed", "credential", id, {
      label: data.label,
    }).catch(console.error);

    return NextResponse.json({
      credential: { ...data, value: decryptedValue, encrypted_value: undefined },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch credential";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { label, credentialType, value, username, url, notes, expiresAt } = body as Record<string, string | undefined>;

    const payload: Record<string, unknown> = {};
    if (label !== undefined) payload.label = label;
    if (credentialType !== undefined) payload.credential_type = credentialType;
    if (username !== undefined) payload.username = username || null;
    if (url !== undefined) payload.url = url || null;
    if (notes !== undefined) payload.notes = notes || null;
    if (expiresAt !== undefined) payload.expires_at = expiresAt || null;

    if (value) {
      payload.encrypted_value = await encrypt(value);
      payload.last_rotated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("credentials")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "credential_updated", "credential", id, {
      label: data.label,
      rotated: Boolean(value),
    }).catch(console.error);

    return NextResponse.json({ credential: { ...data, encrypted_value: undefined } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update credential";
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { error } = await supabase.from("credentials").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "credential_deleted", "credential", id).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete credential";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
