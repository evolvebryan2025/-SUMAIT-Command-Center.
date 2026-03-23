"use client";

import { useState } from "react";
import { ArrowLeft, Bell, Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/providers/toast-provider";
import { NotificationRules } from "@/components/settings/notification-rules";

interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  status: "configured" | "not_configured" | "checking";
  detail?: string;
}

export default function NotificationSettingsPage() {
  const { toast } = useToast();

  const [channels, setChannels] = useState<ChannelConfig[]>([
    {
      id: "in_app",
      name: "In-App Notifications",
      description: "Bell icon alerts inside the Command Center. Always active.",
      icon: <Bell size={20} />,
      enabled: true,
      status: "configured",
      detail: "Built-in — no configuration needed",
    },
    {
      id: "email",
      name: "Email Notifications",
      description: "Send email alerts via Resend when tasks are assigned, overdue, or completed.",
      icon: <Mail size={20} />,
      enabled: true,
      status: "not_configured",
      detail: "Requires RESEND_API_KEY environment variable on Vercel",
    },
    {
      id: "slack",
      name: "Slack Alerts",
      description: "Post alerts to a Slack channel for team-wide visibility on task changes and client health.",
      icon: <MessageSquare size={20} />,
      enabled: true,
      status: "not_configured",
      detail: "Requires SLACK_WEBHOOK_URL environment variable on Vercel",
    },
  ]);

  const handleTest = async (channelId: string) => {
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Test notification sent via ${channelId}`, "success");
      } else {
        toast(data.error ?? "Test failed", "error");
      }
    } catch {
      toast("Failed to send test notification", "error");
    }
  };

  const handleCheck = async () => {
    try {
      const res = await fetch("/api/notifications/status");
      const data = await res.json();
      if (res.ok) {
        setChannels((prev) =>
          prev.map((ch) => ({
            ...ch,
            status: data[ch.id] ? "configured" : "not_configured",
          }))
        );
        toast("Channel status refreshed", "success");
      }
    } catch {
      toast("Failed to check status", "error");
    }
  };

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
            Notification Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Configure how you receive alerts about tasks, clients, and system events.
          </p>
        </div>
      </div>

      {/* Notification channels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Channels</h2>
          <Button variant="ghost" size="sm" onClick={handleCheck}>
            Refresh Status
          </Button>
        </div>

        {channels.map((channel) => (
          <Card key={channel.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${channel.status === "configured" ? "text-[var(--status-active)]" : "text-[var(--color-text-secondary)]"}`}>
                    {channel.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{channel.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {channel.description}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      {channel.status === "configured" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-active)]">
                          <CheckCircle2 size={14} /> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-warning)]">
                          Not configured
                        </span>
                      )}
                      {channel.detail && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          — {channel.detail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {channel.status === "configured" && channel.id !== "in_app" && (
                    <Button variant="ghost" size="sm" onClick={() => handleTest(channel.id)}>
                      Test
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Event types */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Events</h2>
        <Card>
          <div className="p-4 space-y-3">
            {[
              { event: "Task Assigned", desc: "When a task is assigned to a team member", channels: "In-app, Email, Slack" },
              { event: "Task Overdue", desc: "When a task passes its due date", channels: "In-app, Email, Slack" },
              { event: "Task Completed", desc: "When an assigned task is marked complete", channels: "In-app" },
              { event: "Client Health Low", desc: "When a client health score drops below 40", channels: "In-app, Slack" },
              { event: "Report Ready", desc: "When a generated report is available", channels: "In-app" },
            ].map((item) => (
              <div key={item.event} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{item.event}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{item.desc}</p>
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">{item.channels}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Notification Rules */}
      <NotificationRules />

      {/* Setup guide */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Setup Guide</h2>
        <Card>
          <div className="p-4 space-y-4 text-sm text-[var(--color-text-secondary)]">
            <div>
              <p className="font-medium text-[var(--color-text)] mb-1">Email (Resend)</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Sign up at <span className="text-[var(--color-primary)]">resend.com</span> (free: 100 emails/day)</li>
                <li>Create an API key</li>
                <li>Add <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] font-mono text-xs">RESEND_API_KEY</code> to Vercel env vars</li>
                <li>Optionally set <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] font-mono text-xs">RESEND_FROM_EMAIL</code> (default: notifications@sumait.ai)</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-[var(--color-text)] mb-1">Slack</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create an Incoming Webhook in your Slack workspace</li>
                <li>Copy the webhook URL</li>
                <li>Add <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] font-mono text-xs">SLACK_WEBHOOK_URL</code> to Vercel env vars</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
