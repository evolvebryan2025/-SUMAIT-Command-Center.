import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    logActivity(supabase, "global_sign_out", "profile", user.id).catch(console.error);

    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign out";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
