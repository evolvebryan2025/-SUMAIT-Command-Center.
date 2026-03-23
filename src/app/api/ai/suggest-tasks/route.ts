import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a task planning assistant for SUMAIT AI AGENTS. Given meeting notes or context, suggest specific actionable tasks. Return a JSON array of tasks with: title, description, priority (low/medium/high/urgent), suggested_assignee (if mentioned). Return ONLY valid JSON, no markdown.`;

// Rate limit: 5 requests/minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  rateLimitMap.set(userId, { count: entry.count + 1, resetAt: entry.resetAt });
  return true;
}

interface SuggestedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  suggested_assignee: string | null;
}

interface RequestBody {
  context: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Auth + admin check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 5 requests per minute." },
        { status: 429 }
      );
    }

    const body: RequestBody = await request.json();

    if (!body.context || typeof body.context !== "string") {
      return NextResponse.json(
        { error: "Context string is required" },
        { status: 400 }
      );
    }

    if (body.context.length > 10_000) {
      return NextResponse.json(
        { error: "Context must be 10,000 characters or less" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: body.context,
        },
      ],
    });

    // Extract text content from response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let tasks: SuggestedTask[];
    try {
      const parsed = JSON.parse(textBlock.text);
      tasks = Array.isArray(parsed) ? parsed : [];
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    // Validate and sanitize each task
    const validPriorities = new Set(["low", "medium", "high", "urgent"]);
    const sanitizedTasks = tasks
      .filter(
        (t) =>
          t &&
          typeof t.title === "string" &&
          t.title.trim().length > 0
      )
      .map((t) => ({
        title: String(t.title).trim().slice(0, 200),
        description: typeof t.description === "string" ? t.description.trim().slice(0, 1000) : "",
        priority: validPriorities.has(t.priority) ? t.priority : "medium",
        suggested_assignee:
          typeof t.suggested_assignee === "string" && t.suggested_assignee.trim()
            ? t.suggested_assignee.trim()
            : null,
      }));

    return NextResponse.json({ tasks: sanitizedTasks });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate task suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
