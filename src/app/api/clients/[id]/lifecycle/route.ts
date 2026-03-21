import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { lifecycleStage, nextReviewDate, monthlyValue } = body as {
      lifecycleStage?: string;
      nextReviewDate?: string;
      monthlyValue?: number;
    };

    // Get current client for stage change detection
    const { data: current } = await supabase
      .from("clients")
      .select("lifecycle_stage")
      .eq("id", id)
      .single();

    const payload: Record<string, unknown> = {};
    if (lifecycleStage !== undefined) payload.lifecycle_stage = lifecycleStage;
    if (nextReviewDate !== undefined) payload.next_review_date = nextReviewDate || null;
    if (monthlyValue !== undefined) payload.monthly_value = monthlyValue;

    // Set timestamp fields based on stage transitions
    if (lifecycleStage === "active" && current?.lifecycle_stage === "onboarding") {
      payload.onboarded_at = new Date().toISOString();
    }
    if (lifecycleStage === "churned") {
      payload.churned_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log stage change as client event
    if (lifecycleStage && lifecycleStage !== current?.lifecycle_stage) {
      await supabase.from("client_events").insert({
        client_id: id,
        event_type: "stage_change",
        title: `Stage changed to ${lifecycleStage}`,
        description: `Lifecycle stage updated from ${current?.lifecycle_stage ?? "unknown"} to ${lifecycleStage}`,
        metadata: {
          from: current?.lifecycle_stage,
          to: lifecycleStage,
        },
        created_by: user.id,
      });
    }

    logActivity(supabase, "client_lifecycle_updated", "client", id, {
      changes: Object.keys(payload),
    }).catch(console.error);

    return NextResponse.json({ client: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update lifecycle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
