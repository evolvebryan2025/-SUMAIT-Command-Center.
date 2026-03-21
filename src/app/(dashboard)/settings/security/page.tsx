"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut, Shield, Clock, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { createClient } from "@/lib/supabase/client";
import { formatDate, capitalize } from "@/lib/utils";

interface SecurityInfo {
  lastSignIn: string | null;
  createdAt: string;
  role: string;
}

export default function SecuritySettingsPage() {
  const { profile, loading: profileLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [info, setInfo] = useState<SecurityInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/security-info");
        if (res.ok) {
          const data = await res.json();
          setInfo(data);
        }
      } catch {
        // Ignore
      } finally {
        setLoadingInfo(false);
      }
    }
    load();
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const handleSignOutAll = useCallback(async () => {
    setSigningOutAll(true);
    try {
      const res = await fetch("/api/auth/sign-out-all", { method: "POST" });
      if (res.ok) {
        toast("Signed out from all devices", "success");
        router.push("/login");
      } else {
        const data = await res.json();
        toast(data.error ?? "Failed to sign out", "error");
        setSigningOutAll(false);
      }
    } catch {
      toast("Failed to sign out", "error");
      setSigningOutAll(false);
    }
  }, [toast, router]);

  const isLoading = profileLoading || loadingInfo;

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
            Security
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your account security and sessions.
          </p>
        </div>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2 mb-4">
          <Shield size={20} className="text-[var(--color-primary)]" />
          Account Overview
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-1 flex items-center gap-1">
                <UserCircle size={12} /> Role
              </span>
              <Badge variant={info?.role === "admin" ? "active" : "info"}>
                {capitalize(info?.role ?? "member")}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-1 flex items-center gap-1">
                <Clock size={12} /> Account Created
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {info?.createdAt ? formatDate(info.createdAt) : "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block mb-1 flex items-center gap-1">
                <Clock size={12} /> Last Sign In
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {info?.lastSignIn ? formatDate(info.lastSignIn) : "\u2014"}
              </span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2 mb-4">
          <LogOut size={20} className="text-[var(--color-primary)]" />
          Sessions
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Sign out of your current session or all devices at once.
        </p>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Sign Out"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSignOutAll} disabled={signingOutAll}>
            {signingOutAll ? "Signing out..." : "Sign Out All Devices"}
          </Button>
        </div>
      </Card>

      <PasswordChangeForm />
    </div>
  );
}
