"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ClientPortalAccess } from "@/lib/types";

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portalAccess, setPortalAccess] = useState<ClientPortalAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);

        // If client role, fetch portal access for client_id
        if (data?.role === "client") {
          const { data: access } = await supabase
            .from("client_portal_access")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          setPortalAccess(access);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  return {
    profile,
    portalAccess,
    loading,
    isAdmin: profile?.role === "admin",
    isClient: profile?.role === "client",
    clientId: portalAccess?.client_id ?? null,
  };
}
