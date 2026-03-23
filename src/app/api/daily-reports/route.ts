import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    const searchParams = request.nextUrl.searchParams;
    const dateFilter = searchParams.get("date");
    const userIdFilter = searchParams.get("userId");

    let query = supabase
      .from("daily_reports")
      .select(
        "*, daily_report_items(*, daily_report_attachments(*))"
      )
      .order("report_date", { ascending: false })
      .limit(100);

    // Non-admins can only see their own reports
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    } else {
      // Admins can filter by userId
      if (userIdFilter) {
        query = query.eq("user_id", userIdFilter);
      }
    }

    // Filter by date if provided
    if (dateFilter) {
      query = query.eq("report_date", dateFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch daily reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface ReportItem {
  item_type: string;
  description: string;
  links?: string[] | null;
  task_id?: string | null;
  client_id?: string | null;
}

interface ReportBody {
  report_date: string;
  items: ReportItem[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ReportBody;
    const { report_date, items } = body;

    if (!report_date || !report_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json(
        { error: "Valid report_date (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one report item is required" },
        { status: 400 }
      );
    }

    // Check if report already exists for this user + date
    const { data: existing } = await supabase
      .from("daily_reports")
      .select("id")
      .eq("user_id", user.id)
      .eq("report_date", report_date)
      .single();

    let reportId: string;

    if (existing) {
      // Delete old items (cascade will handle attachments if configured,
      // otherwise delete explicitly)
      await supabase
        .from("daily_report_items")
        .delete()
        .eq("report_id", existing.id);

      // Update existing report timestamp
      const { error: updateError } = await supabase
        .from("daily_reports")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      reportId = existing.id;
    } else {
      // Create new report
      const { data: newReport, error: createError } = await supabase
        .from("daily_reports")
        .insert({
          user_id: user.id,
          report_date,
          status: "submitted",
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: createError.message },
          { status: 500 }
        );
      }

      reportId = newReport.id;
    }

    // Insert new items
    const itemRows = items.map((item, index) => ({
      report_id: reportId,
      item_type: item.item_type,
      description: item.description,
      links: item.links ?? null,
      task_id: item.task_id ?? null,
      client_id: item.client_id || null,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("daily_report_items")
      .insert(itemRows);

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    // Fetch the complete report with items
    const { data: report, error: fetchError } = await supabase
      .from("daily_reports")
      .select("*, daily_report_items(*, daily_report_attachments(*))")
      .eq("id", reportId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // Log activity
    logActivity(supabase, "daily_report_submitted", "daily_report", reportId, {
      report_date,
      item_count: items.length,
    }).catch(console.error);

    return NextResponse.json(
      { report },
      { status: existing ? 200 : 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create daily report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
