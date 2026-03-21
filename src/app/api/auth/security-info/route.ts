import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const adminClient = createAdminClient();
    const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);

    return NextResponse.json({
      lastSignIn: authUser?.user?.last_sign_in_at ?? null,
      createdAt: authUser?.user?.created_at ?? user.created_at,
      role: profile?.role ?? "member",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get security info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
