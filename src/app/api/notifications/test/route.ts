import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { sendSlackNotification } from "@/lib/slack";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channel } = body as { channel?: string };

    if (!channel) {
      return NextResponse.json(
        { error: "Missing channel parameter" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", user.id)
      .single();

    switch (channel) {
      case "email": {
        if (!process.env.RESEND_API_KEY) {
          return NextResponse.json(
            { error: "RESEND_API_KEY not configured" },
            { status: 400 }
          );
        }
        const sent = await sendEmail({
          to: profile?.email ?? user.email ?? "",
          subject: "SUMAIT Command Center — Test Email",
          body: "This is a test email notification from the SUMAIT AI Command Center. If you received this, email notifications are working correctly.",
          type: "info",
        });
        return NextResponse.json({ success: sent });
      }

      case "slack": {
        if (!process.env.SLACK_WEBHOOK_URL) {
          return NextResponse.json(
            { error: "SLACK_WEBHOOK_URL not configured" },
            { status: 400 }
          );
        }
        const sent = await sendSlackNotification({
          title: "Test Notification",
          message: `Test alert from SUMAIT Command Center, triggered by ${profile?.name ?? "Unknown"}.`,
          type: "info",
        });
        return NextResponse.json({ success: sent });
      }

      default:
        return NextResponse.json(
          { error: `Unknown channel: ${channel}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Test notification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
