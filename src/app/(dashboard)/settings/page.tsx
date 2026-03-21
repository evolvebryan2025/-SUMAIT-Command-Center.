"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, FileText, Palette, Shield, User, Webhook } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export default function SettingsPage() {
  const { isAdmin } = useUser();

  return (
    <div>
      <h1 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-text)] mb-2">
        Settings
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Manage your command center configuration.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/settings/profile">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Edit your name, avatar, and password</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/security">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage sessions and account security</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/dev-kits">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Dev Kits</CardTitle>
                  <CardDescription>Manage brand kits and theme switching</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/notifications">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Email, Slack, and in-app notification settings</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/integrations">
          <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Webhook className="text-[var(--color-primary)]" size={24} />
                <div>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>n8n webhooks, Instantly accounts, and API keys</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {isAdmin && (
          <Link href="/settings/audit">
            <Card className="hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="text-[var(--color-primary)]" size={24} />
                  <div>
                    <CardTitle>Audit Log</CardTitle>
                    <CardDescription>View all system activity and changes</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
