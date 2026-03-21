import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NotificationType } from "@/lib/types";

const VALID_TYPES: NotificationType[] = [
  "task_assigned",
  "task_overdue",
  "client_health",
  "report_ready",
  "system",
  "info",
];

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.NOTIFICATION_WEBHOOK_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, message, type, entityType, entityId, channels } =
      body as {
        userId?: string;
        title?: string;
        message?: string;
        type?: string;
        entityType?: string;
        entityId?: string;
        channels?: Array<"in_app" | "email" | "slack">;
      };

    if (!userId || !title || !type) {
      return NextResponse.json(
        { error: "Missing required fields: userId, title, type" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type as NotificationType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Look up user email for email notifications
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    const result = await notify({
      supabase,
      userId,
      email: profile?.email,
      title,
      message: message ?? "",
      type: type as NotificationType,
      entityType,
      entityId,
      channels,
    });

    return NextResponse.json({ success: true, delivered: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
