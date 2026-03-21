import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentIds } = await request.json();
    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return NextResponse.json({ error: "commentIds array required" }, { status: 400 });
    }

    const rows = commentIds.map((cid: string) => ({ comment_id: cid, user_id: user.id }));
    await supabase.from("comment_reads").upsert(rows, { onConflict: "comment_id,user_id" });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
