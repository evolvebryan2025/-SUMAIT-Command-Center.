"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { ClientBranding } from "@/lib/types";
import { PORTAL_DEFAULT_BRANDING } from "@/lib/constants";

export function usePortalBranding() {
  const { clientId } = useUser();
  const [branding, setBranding] = useState<ClientBranding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from("client_branding")
        .select("*")
        .eq("client_id", clientId!)
        .single();

      setBranding(data);
      setLoading(false);
    }
    load();
  }, [clientId]);

  const resolved = branding ?? {
    brand_name: PORTAL_DEFAULT_BRANDING.brand_name,
    logo_url: null,
    primary_bg: PORTAL_DEFAULT_BRANDING.primary_bg,
    accent_color: PORTAL_DEFAULT_BRANDING.accent_color,
    text_color: PORTAL_DEFAULT_BRANDING.text_color,
    font_heading: PORTAL_DEFAULT_BRANDING.font_heading,
    font_body: PORTAL_DEFAULT_BRANDING.font_body,
  };

  return { branding: resolved, loading };
}
