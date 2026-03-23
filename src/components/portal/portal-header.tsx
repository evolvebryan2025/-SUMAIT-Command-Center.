"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePortalBranding } from "@/hooks/use-portal-branding";

export function PortalHeader() {
  const { branding } = usePortalBranding();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      className="sticky top-0 z-30 border-b px-6 py-4 flex items-center justify-between"
      style={{
        backgroundColor: branding.primary_bg,
        borderColor: `${branding.text_color}10`,
      }}
    >
      <div className="flex items-center gap-3">
        {branding.logo_url && (
          <img src={branding.logo_url} alt="" className="h-8 w-8 rounded" />
        )}
        <span
          className="text-lg font-bold"
          style={{
            color: branding.text_color,
            fontFamily: branding.font_heading,
          }}
        >
          {branding.brand_name}
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        style={{ color: branding.text_color }}
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </header>
  );
}
