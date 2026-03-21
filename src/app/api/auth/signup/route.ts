import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_MEMBERS = 4;

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, password } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!email || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Check current member count (enforce hard limit)
  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "member")
    .eq("is_active", true);

  if (countError) {
    return NextResponse.json(
      { error: "Unable to verify signup availability" },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= MAX_MEMBERS) {
    return NextResponse.json(
      { error: "Signup is currently closed. Maximum team capacity reached." },
      { status: 403 }
    );
  }

  // Create the auth user with the service role client
  const { data, error: createError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), role: "member" },
  });

  if (createError) {
    // Supabase returns "User already registered" for duplicate emails
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // The handle_new_user() trigger auto-creates the profile, but in case of
  // a race condition with the trigger, ensure it exists
  const { error: profileCheck } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .single();

  if (profileCheck) {
    // Trigger hasn't fired yet — insert manually
    await supabase.from("profiles").upsert({
      id: data.user.id,
      name: name.trim(),
      email: email.trim(),
      role: "member",
      is_active: true,
    });
  }

  return NextResponse.json({ success: true });
}
