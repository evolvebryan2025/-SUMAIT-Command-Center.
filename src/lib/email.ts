import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "SUMAIT AI <notifications@sumait.ai>";

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  type: string;
  entityType?: string;
  entityId?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email notification");
    return false;
  }

  try {
    const html = buildEmailHtml(payload);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html,
    });

    if (error) {
      console.error("[email] Send failed:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Unexpected error:", err instanceof Error ? err.message : err);
    return false;
  }
}

function buildEmailHtml(payload: EmailPayload): string {
  const typeColors: Record<string, string> = {
    task_assigned: "#3b82f6",
    task_overdue: "#ef4444",
    client_health: "#eab308",
    report_ready: "#22c55e",
    system: "#6b7280",
    info: "#8b5cf6",
  };

  const accentColor = typeColors[payload.type] ?? "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#141414;border-radius:12px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.1);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Outfit',Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">SUMAIT</span>
                    <span style="font-family:'Outfit',Arial,sans-serif;font-size:20px;font-weight:400;color:rgba(255,255,255,0.6);"> AI</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 12px;border-radius:20px;background-color:${accentColor}22;color:${accentColor};font-size:12px;font-weight:600;text-transform:uppercase;">${payload.type.replace(/_/g, " ")}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-family:'Outfit',Arial,sans-serif;font-size:18px;font-weight:600;color:#ffffff;">${escapeHtml(payload.subject)}</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7);">${escapeHtml(payload.body)}</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://sumait-command-center.vercel.app"}${payload.entityType && payload.entityId ? `/${payload.entityType}/${payload.entityId}` : ""}" style="display:inline-block;padding:10px 24px;background-color:${accentColor};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View in Command Center</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.1);text-align:center;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);">SUMAIT AI Command Center &mdash; Automated notification</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
