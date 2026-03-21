import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import sanitizeHtml from "sanitize-html";
import { NextRequest, NextResponse } from "next/server";

// Rate limiter
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(userId: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span", "br", "hr",
  "strong", "em", "b", "i", "u", "s", "a", "img", "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td", "section", "header",
  "footer", "main", "article", "nav", "figure", "figcaption",
  "blockquote", "pre", "code", "style",
];

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    if (!checkRate(user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const { html, instruction, history } = await request.json();
    if (!html || !instruction) {
      return NextResponse.json(
        { error: "html and instruction required" },
        { status: 400 }
      );
    }

    // Strip base64 images, replace with placeholders
    const imageMap: Record<string, string> = {};
    let imgIndex = 0;
    const strippedHtml = html.replace(
      /src="data:image\/[^"]+"/g,
      (match: string) => {
        const key = `[IMG_${imgIndex++}]`;
        imageMap[key] = match;
        return `src="${key}"`;
      }
    );

    const messages: Array<{ role: string; content: string }> = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-5)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({
      role: "user",
      content: `Here is the current HTML report:\n\n\`\`\`html\n${strippedHtml.slice(0, 30000)}\n\`\`\`\n\nInstruction: ${instruction}\n\nReturn ONLY the modified HTML. Do not explain, just output the HTML.`,
    });

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system:
        "You are an HTML report editor. You receive an HTML document and an editing instruction. Apply the instruction and return the complete modified HTML. Keep all existing styles, structure, and content unless the instruction says to change them. Output ONLY HTML, no explanation.",
      messages: messages as Array<{
        role: "user" | "assistant";
        content: string;
      }>,
    });

    let editedHtml = "";
    for (const block of response.content) {
      if (block.type === "text") editedHtml += block.text;
    }

    // Extract HTML from code blocks if wrapped
    const codeBlockMatch = editedHtml.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) editedHtml = codeBlockMatch[1].trim();

    // Reinsert base64 images
    for (const [key, value] of Object.entries(imageMap)) {
      editedHtml = editedHtml.replace(`src="${key}"`, value);
    }

    // Sanitize
    const sanitized = sanitizeHtml(editedHtml, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: {
        "*": ["class", "id", "style"],
        a: ["href", "target", "rel"],
        img: ["src", "alt", "width", "height"],
        td: ["colspan", "rowspan"],
        th: ["colspan", "rowspan"],
      },
      allowedSchemes: ["http", "https", "data"],
    });

    return NextResponse.json({ html: sanitized });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
