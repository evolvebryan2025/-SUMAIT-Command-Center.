import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params;

  let body: { is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ is_active: body.is_active })
    .eq("id", employeeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params;

  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Prevent self-deletion
  if (employeeId === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify the target employee exists
  const { data: targetProfile, error: profileError } = await admin
    .from("profiles")
    .select("id, name, role")
    .eq("id", employeeId)
    .single();

  if (profileError || !targetProfile) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Nullify all FK references to this profile so deletion doesn't violate constraints
  const nullifyQueries = [
    admin.from("tasks").update({ assigned_to: null }).eq("assigned_to", employeeId),
    admin.from("tasks").update({ created_by: null }).eq("created_by", employeeId),
    admin.from("contact_tasks").update({ assigned_to: null }).eq("assigned_to", employeeId),
    admin.from("alerts").update({ resolved_by: null }).eq("resolved_by", employeeId),
    admin.from("activity_log").update({ user_id: null }).eq("user_id", employeeId),
    admin.from("generated_reports").update({ generated_by: null }).eq("generated_by", employeeId),
  ];

  // Run nullify operations in parallel — some tables may not exist yet, ignore errors
  const results = await Promise.allSettled(nullifyQueries);
  const failures = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.error)
  );

  // Also clean up tables that cascade from profiles or reference it
  // (notifications, task_comments, daily_reports, etc. — these have ON DELETE CASCADE or
  //  reference auth.users directly, so they'll be handled by the cascade)

  // Also nullify vault/kb references if those tables exist
  await Promise.allSettled([
    admin.from("vault_files").update({ created_by: null }).eq("created_by", employeeId),
    admin.from("kb_articles").update({ created_by: null }).eq("created_by", employeeId),
    admin.from("client_lifecycle").update({ created_by: null }).eq("created_by", employeeId),
  ]);

  // Delete the auth user — this cascades to profiles table
  const { error: deleteError } = await admin.auth.admin.deleteUser(employeeId);

  if (deleteError) {
    return NextResponse.json(
      { error: `Failed to delete: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `${targetProfile.name} has been permanently deleted`,
  });
}
