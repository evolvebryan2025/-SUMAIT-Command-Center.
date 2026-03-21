"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { ColorPicker } from "@/components/ui/color-picker";
import { DevKitPreview } from "@/components/dev-kits/dev-kit-preview";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/providers/toast-provider";
import type { DevKit, Client } from "@/lib/types";

interface DevKitFormProps {
  devKit?: DevKit;
}

export function DevKitForm({ devKit }: DevKitFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: devKit?.name || "",
    client_id: devKit?.client_id || "",
    color_primary: devKit?.color_primary || "#ef4444",
    color_accent: devKit?.color_accent || "#f87171",
    color_background: devKit?.color_background || "#0a0a0a",
    color_surface: devKit?.color_surface || "#141414",
    color_text: devKit?.color_text || "#ffffff",
    font_heading: devKit?.font_heading || "Outfit",
    font_body: devKit?.font_body || "Inter",
    is_default: devKit?.is_default || false,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      setClients((data as Client[]) || []);
    });
  }, []);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    const supabase = createClient();

    if (form.is_default) {
      await supabase.from("dev_kits").update({ is_default: false }).neq("id", devKit?.id || "");
    }

    const payload = {
      ...form,
      client_id: form.client_id || null,
    };

    const { error } = devKit
      ? await supabase.from("dev_kits").update(payload).eq("id", devKit.id)
      : await supabase.from("dev_kits").insert(payload);

    setSaving(false);

    if (error) {
      toast(error.message, "error");
    } else {
      toast(devKit ? "Dev kit updated" : "Dev kit created", "success");
      router.push("/settings/dev-kits");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{devKit ? "Edit Dev Kit" : "New Dev Kit"}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => update("name", e.target.value)} required />

          <SelectField
            label="Client"
            value={form.client_id}
            onChange={(e) => update("client_id", e.target.value)}
            options={[
              { value: "", label: "None (internal)" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <ColorPicker label="Primary" value={form.color_primary} onChange={(v) => update("color_primary", v)} />
            <ColorPicker label="Accent" value={form.color_accent} onChange={(v) => update("color_accent", v)} />
            <ColorPicker label="Background" value={form.color_background} onChange={(v) => update("color_background", v)} />
            <ColorPicker label="Surface" value={form.color_surface} onChange={(v) => update("color_surface", v)} />
            <ColorPicker label="Text" value={form.color_text} onChange={(v) => update("color_text", v)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Heading Font" value={form.font_heading} onChange={(e) => update("font_heading", e.target.value)} />
            <Input label="Body Font" value={form.font_body} onChange={(e) => update("font_body", e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => update("is_default", e.target.checked)}
              className="rounded"
            />
            Set as default
          </label>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : devKit ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <DevKitPreview {...form} />
    </div>
  );
}
