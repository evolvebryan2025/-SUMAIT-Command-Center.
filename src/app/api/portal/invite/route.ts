import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can invite
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { client_id?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { client_id, email } = body;

  if (!client_id || !email?.trim()) {
    return NextResponse.json({ error: "client_id and email are required" }, { status: 400 });
  }

  // Check client exists
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", client_id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Check if portal access already exists for this client
  const adminClient = createAdminClient();
  const { data: existingAccess } = await adminClient
    .from("client_portal_access")
    .select("id, user_id, is_active")
    .eq("client_id", client_id)
    .single();

  let authUserId: string;

  if (existingAccess) {
    // Reactivate if deactivated
    if (!existingAccess.is_active) {
      await adminClient
        .from("client_portal_access")
        .update({ is_active: true })
        .eq("id", existingAccess.id);
    }
    authUserId = existingAccess.user_id;
  } else {
    // Create auth user for client (or find existing)
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email.trim()
    );

    if (existingUser) {
      authUserId = existingUser.id;
    } else {
      // Create new auth user with client role
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim(),
        email_confirm: true,
        user_metadata: { name: client.name, role: "client" },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      authUserId = newUser.user.id;

      // Ensure profile exists with client role
      await adminClient.from("profiles").upsert({
        id: authUserId,
        name: client.name,
        email: email.trim(),
        role: "client",
        is_active: true,
      });
    }

    // Create portal access link
    await adminClient.from("client_portal_access").insert({
      user_id: authUserId,
      client_id,
      invited_by: user.id,
    });
  }

  // Generate magic link
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim(),
    options: {
      redirectTo: `${request.nextUrl.origin}/api/auth/callback?next=/portal`,
    },
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  logActivity(supabase, "portal_invite_sent", "clients", client_id, {
    email: email.trim(),
    client_name: client.name,
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    magic_link: linkData.properties?.action_link,
    message: `Portal invite generated for ${client.name}`,
  });
}
