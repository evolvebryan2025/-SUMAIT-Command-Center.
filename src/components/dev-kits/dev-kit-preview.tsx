"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface DevKitPreviewProps {
  color_primary: string;
  color_accent: string;
  color_background: string;
  color_surface: string;
  color_text: string;
  font_heading: string;
  font_body: string;
  name?: string;
}

export function DevKitPreview(props: DevKitPreviewProps) {
  const { color_primary, color_accent, color_background, color_surface, color_text, font_heading, font_body, name } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
      </CardHeader>
      <div
        className="rounded-lg p-6 space-y-4"
        style={{ backgroundColor: color_background, color: color_text }}
      >
        <h2 style={{ fontFamily: `'${font_heading}', sans-serif`, fontSize: "24px", fontWeight: 700 }}>
          {name || "Brand Kit"} Dashboard
        </h2>
        <p style={{ fontFamily: `'${font_body}', sans-serif`, fontSize: "14px", opacity: 0.7 }}>
          Welcome to the command center.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {["Active Clients", "Tasks", "Team", "Alerts"].map((label, i) => (
            <div
              key={label}
              className="rounded-lg p-3"
              style={{ backgroundColor: color_surface, border: `1px solid ${color_primary}20` }}
            >
              <p style={{ fontFamily: `'${font_body}', sans-serif`, fontSize: "11px", opacity: 0.6 }}>
                {label}
              </p>
              <p style={{ fontFamily: `'${font_heading}', sans-serif`, fontSize: "20px", fontWeight: 700, color: color_primary }}>
                {[7, 24, 6, 3][i]}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: color_primary }}
          >
            Primary Button
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: `${color_accent}20`, color: color_accent, border: `1px solid ${color_accent}40` }}
          >
            Secondary
          </button>
        </div>
      </div>
    </Card>
  );
}
