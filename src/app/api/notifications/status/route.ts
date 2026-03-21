import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    in_app: true,
    email: Boolean(process.env.RESEND_API_KEY),
    slack: Boolean(process.env.SLACK_WEBHOOK_URL),
  });
}
