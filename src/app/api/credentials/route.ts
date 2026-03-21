import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt, maskValue } from "@/lib/encryption";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const clientId = request.nextUrl.searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Decrypt and mask values for display
    const masked = await Promise.all(
      (data ?? []).map(async (cred) => {
        try {
          const decrypted = await decrypt(cred.encrypted_value);
          return { ...cred, masked_value: maskValue(decrypted), encrypted_value: undefined };
        } catch {
          return { ...cred, masked_value: "••••••••", encrypted_value: undefined };
        }
      })
    );

    return NextResponse.json({ credentials: masked });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, label, credentialType, value, username, url, notes, expiresAt } = body as {
      clientId?: string;
      label?: string;
      credentialType?: string;
      value?: string;
      username?: string;
      url?: string;
      notes?: string;
      expiresAt?: string;
    };

    if (!clientId || !label || !value) {
      return NextResponse.json({ error: "clientId, label, and value are required" }, { status: 400 });
    }

    const encryptedValue = await encrypt(value);

    const { data, error } = await supabase
      .from("credentials")
      .insert({
        client_id: clientId,
        label,
        credential_type: credentialType ?? "api_key",
        encrypted_value: encryptedValue,
        username: username || null,
        url: url || null,
        notes: notes || null,
        expires_at: expiresAt || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logActivity(supabase, "credential_created", "credential", data.id, {
      label,
      client_id: clientId,
    }).catch(console.error);

    return NextResponse.json({
      credential: { ...data, masked_value: maskValue(value), encrypted_value: undefined },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create credential";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
