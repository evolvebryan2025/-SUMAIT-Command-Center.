import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Check if table already exists
  const { data: existing } = await admin
    .from("client_resources")
    .select("id")
    .limit(1);

  if (existing !== null) {
    return NextResponse.json({ message: "Table already exists", skipped: true });
  }

  // Table doesn't exist — we need to run raw SQL via Supabase Management API
  // Since we can't run raw SQL via the client library, return instructions
  return NextResponse.json({
    error: "Table does not exist. Please run the migration SQL in the Supabase dashboard SQL editor.",
    sql_file: "supabase/migrations/009_resource_hub.sql",
  }, { status: 400 });
}
