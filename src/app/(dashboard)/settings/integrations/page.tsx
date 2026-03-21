"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, CheckCircle2, ExternalLink, Webhook, Mail, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/toast-provider";

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/notifications/webhook`
      : "/api/notifications/webhook";

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopied(label);
      toast(`Copied ${label}`, "success");
      setTimeout(() => setCopied(null), 2000);
    },
    [toast]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 rounded-[var(--radius)] hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)]">
            Integrations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Connect external services to the Command Center.
          </p>
        </div>
      </div>

      {/* n8n Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Zap className="text-[#ff6d5a] mt-0.5" size={24} />
            <div className="flex-1">
              <CardTitle>n8n Webhook</CardTitle>
              <CardDescription className="mt-1">
                Connect your n8n instance to send notifications to the Command Center.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="px-6 pb-6 space-y-4">
          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Webhook Endpoint
            </label>
            <div className="flex items-center gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl, "webhook URL")}
              >
                {copied === "webhook URL" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </div>

          {/* Setup instructions */}
          <div className="p-4 rounded-[var(--radius)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)]">
            <p className="text-sm font-medium text-[var(--color-text)] mb-3">n8n Setup Steps:</p>
            <ol className="text-sm text-[var(--color-text-secondary)] space-y-2 list-decimal list-inside">
              <li>
                In your n8n workflow, add an <strong>HTTP Request</strong> node
              </li>
              <li>
                Set method to <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] font-mono text-xs">POST</code>
              </li>
              <li>
                Set URL to the webhook endpoint above
              </li>
              <li>
                Add header: <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] font-mono text-xs">x-webhook-secret</code> = your NOTIFICATION_WEBHOOK_SECRET value
              </li>
              <li>
                Set body (JSON):
                <pre className="mt-2 p-3 rounded bg-[rgba(0,0,0,0.3)] font-mono text-xs overflow-x-auto">
{`{
  "userId": "{{user_uuid}}",
  "title": "Notification title",
  "message": "Notification body text",
  "type": "task_assigned",
  "entityType": "tasks",
  "entityId": "{{task_uuid}}",
  "channels": ["in_app", "email", "slack"]
}`}
                </pre>
              </li>
            </ol>
            <div className="mt-3 text-xs text-[var(--color-text-secondary)]">
              <strong>Valid types:</strong> task_assigned, task_overdue, client_health, report_ready, system, info
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
              <strong>Channels</strong> (optional): in_app, email, slack — defaults to all configured
            </div>
          </div>

          {/* Environment variable reminder */}
          <div className="flex items-start gap-2 p-3 rounded-[var(--radius)] bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.2)]">
            <span className="text-[var(--status-warning)] text-sm">!</span>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Set <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] font-mono text-xs">NOTIFICATION_WEBHOOK_SECRET</code> on
              Vercel to enable webhook authentication. Use the same value in your n8n HTTP Request header.
            </p>
          </div>
        </div>
      </Card>

      {/* Instantly Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Mail className="text-[var(--color-primary)] mt-0.5" size={24} />
            <div className="flex-1">
              <CardTitle>Instantly.ai</CardTitle>
              <CardDescription className="mt-1">
                Manage your Instantly email outreach accounts.
              </CardDescription>
            </div>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm">
                <ExternalLink size={14} className="mr-1" />
                Campaigns
              </Button>
            </Link>
          </div>
        </CardHeader>
        <div className="px-6 pb-6">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Instantly accounts are managed from the Campaigns page via the account selector dropdown.
            You can add multiple API keys and switch between them.
          </p>
        </div>
      </Card>

      {/* Webhook Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Webhook className="text-[var(--color-primary)] mt-0.5" size={24} />
            <div className="flex-1">
              <CardTitle>Webhook API</CardTitle>
              <CardDescription className="mt-1">
                Use the notification webhook to send alerts from any external system.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="px-6 pb-6">
          <pre className="p-3 rounded bg-[rgba(0,0,0,0.3)] font-mono text-xs text-[var(--color-text-secondary)] overflow-x-auto">
{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: YOUR_SECRET" \\
  -d '{
    "userId": "USER_UUID",
    "title": "Alert title",
    "message": "Alert details",
    "type": "system"
  }'`}
          </pre>
        </div>
      </Card>
    </div>
  );
}
