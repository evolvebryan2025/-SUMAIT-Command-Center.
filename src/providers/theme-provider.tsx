"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { DevKit } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface ThemeContextType {
  activeKit: DevKit | null;
  setActiveKit: (kit: DevKit) => void;
  devKits: DevKit[];
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  activeKit: null,
  setActiveKit: () => {},
  devKits: [],
  loading: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(kit: DevKit) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", kit.color_primary);
  root.style.setProperty("--color-accent", kit.color_accent);
  root.style.setProperty("--color-background", kit.color_background);
  root.style.setProperty("--color-surface", kit.color_surface);
  root.style.setProperty("--color-text", kit.color_text);
  root.style.setProperty("--font-heading", `'${kit.font_heading}', sans-serif`);
  root.style.setProperty("--font-body", `'${kit.font_body}', sans-serif`);
  document.body.style.background = kit.color_background;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [devKits, setDevKits] = useState<DevKit[]>([]);
  const [activeKit, setActiveKitState] = useState<DevKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadKits() {
      const { data } = await supabase
        .from("dev_kits")
        .select("*")
        .order("is_default", { ascending: false });

      if (data && data.length > 0) {
        setDevKits(data);
        const savedKitId = localStorage.getItem("sumait_active_kit");
        const savedKit = savedKitId ? data.find((k: DevKit) => k.id === savedKitId) : null;
        const defaultKit = savedKit || data.find((k: DevKit) => k.is_default) || data[0];
        setActiveKitState(defaultKit);
        applyTheme(defaultKit);
      }
      setLoading(false);
    }

    loadKits();
  }, []);

  function setActiveKit(kit: DevKit) {
    setActiveKitState(kit);
    applyTheme(kit);
    localStorage.setItem("sumait_active_kit", kit.id);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").update({ active_dev_kit_id: kit.id }).eq("id", user.id).then(() => {});
      }
    });
  }

  return (
    <ThemeContext.Provider value={{ activeKit, setActiveKit, devKits, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}
