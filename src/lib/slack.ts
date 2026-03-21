const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? null;

interface SlackPayload {
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
}

export async function sendSlackNotification(payload: SlackPayload): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("[slack] SLACK_WEBHOOK_URL not set — skipping Slack notification");
    return false;
  }

  try {
    const typeEmoji: Record<string, string> = {
      task_assigned: ":clipboard:",
      task_overdue: ":warning:",
      client_health: ":heartbeat:",
      report_ready: ":bar_chart:",
      system: ":gear:",
      info: ":information_source:",
    };

    const emoji = typeEmoji[payload.type] ?? ":bell:";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sumait-command-center.vercel.app";
    const link = payload.entityType && payload.entityId
      ? `${appUrl}/${payload.entityType}/${payload.entityId}`
      : appUrl;

    const blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: `${emoji} ${payload.title}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: payload.message },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `*Type:* ${payload.type.replace(/_/g, " ").toUpperCase()}` },
          { type: "mrkdwn", text: `<${link}|View in Command Center>` },
        ],
      },
      { type: "divider" },
    ];

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      console.error("[slack] Webhook failed:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[slack] Unexpected error:", err instanceof Error ? err.message : err);
    return false;
  }
}
