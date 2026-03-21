import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Admin only
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const action = params.get("action");
    const entityType = params.get("entityType");
    const userId = params.get("userId");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const search = params.get("search");
    const cursor = params.get("cursor");
    const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);

    let query = supabase
      .from("activity_log")
      .select("*, profiles:user_id(name, email)")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (action) query = query.eq("action", action);
    if (entityType) query = query.eq("entity_type", entityType);
    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59.999Z");
    if (search) {
      const sanitized = search.replace(/[%_.,()]/g, "");
      if (sanitized) {
        query = query.or(`action.ilike.%${sanitized}%,entity_type.ilike.%${sanitized}%`);
      }
    }

    if (cursor) {
      const { data: cursorItem } = await supabase
        .from("activity_log")
        .select("created_at")
        .eq("id", cursor)
        .single();

      if (cursorItem) {
        query = query.or(
          `created_at.lt.${cursorItem.created_at},and(created_at.eq.${cursorItem.created_at},id.lt.${cursor})`
        );
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const logs = data ?? [];
    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({ logs: items, nextCursor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
