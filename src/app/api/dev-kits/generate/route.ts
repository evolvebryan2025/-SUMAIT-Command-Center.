import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a brand identity extraction expert. Given the HTML content of a website, analyze the visual design and extract the brand identity into a structured dev kit format.

Extract the following:
1. **name**: A short brand name (2-4 words max)
2. **colors**: primary (main brand color), accent (secondary/highlight), background (page bg), surface (card/component bg), text (main text color)
3. **fonts**: heading font family, body font family
4. **description**: One sentence describing the brand aesthetic

Rules:
- Return ONLY valid JSON, no markdown fencing, no explanation
- Colors must be valid hex values (e.g., #ef4444)
- If you can't determine a color, use sensible defaults based on the brand aesthetic
- Font names should be clean family names (e.g., "Inter", not "Inter, sans-serif")
- If no custom fonts detected, default to "Outfit" for headings and "Inter" for body

JSON schema:
{
  "name": string,
  "description": string,
  "color_primary": string,
  "color_accent": string,
  "color_background": string,
  "color_surface": string,
  "color_text": string,
  "font_heading": string,
  "font_body": string
}`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { url, clientId } = body as { url?: string; clientId?: string };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the website HTML
    const siteResponse = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SumaitBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!siteResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch website: ${siteResponse.status}` },
        { status: 400 }
      );
    }

    const html = await siteResponse.text();

    // Truncate HTML to avoid token limits — keep head + first 15k chars of body
    const truncatedHtml = truncateHtml(html, 20000);

    // Call Claude to extract brand identity
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract the brand identity from this website (${parsedUrl.hostname}):\n\n${truncatedHtml}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    let brandData: Record<string, string>;
    try {
      // Strip markdown fencing if present
      const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      brandData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse brand extraction result", raw: responseText },
        { status: 500 }
      );
    }

    // Save to dev_kits table
    const devKitPayload = {
      name: brandData.name ?? parsedUrl.hostname,
      client_id: clientId || null,
      color_primary: brandData.color_primary ?? "#ef4444",
      color_accent: brandData.color_accent ?? "#f87171",
      color_background: brandData.color_background ?? "#0a0a0a",
      color_surface: brandData.color_surface ?? "#141414",
      color_text: brandData.color_text ?? "#ffffff",
      font_heading: brandData.font_heading ?? "Outfit",
      font_body: brandData.font_body ?? "Inter",
      tokens_json: {
        source_url: url,
        description: brandData.description ?? "",
        generated_at: new Date().toISOString(),
      },
    };

    const { data: devKit, error } = await supabase
      .from("dev_kits")
      .insert(devKitPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      devKit,
      extracted: brandData,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Dev kit generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function truncateHtml(html: string, maxChars: number): string {
  // Extract <head> content for CSS/meta info
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch?.[1] ?? "";

  // Extract <body> content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch?.[1] ?? html;

  // Remove scripts and large base64 data
  const cleaned = bodyContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/data:[^"'\s]+/g, "[data-uri]")
    .replace(/\s+/g, " ");

  const headCleaned = headContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+/g, " ");

  const combined = `<head>${headCleaned}</head>\n<body>${cleaned}</body>`;

  if (combined.length <= maxChars) return combined;
  return combined.slice(0, maxChars) + "\n<!-- truncated -->";
}
