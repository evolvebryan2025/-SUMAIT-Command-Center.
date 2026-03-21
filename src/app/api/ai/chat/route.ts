import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are SUMAIT AI, an assistant for the SUMAIT Command Center. You help with client management, task tracking, team coordination, and report generation.

Keep responses concise and actionable. Use bullet points for lists.

You have access to the user's context data provided in the conversation. When the user asks about clients, tasks, or team members, use the context to provide specific, helpful answers.

If you don't have enough context to answer a question, say so clearly and suggest what information would help.`;

interface MessageInput {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: MessageInput[];
  context?: string;
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

    const body: RequestBody = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate message content length
    for (const msg of body.messages) {
      if (typeof msg.content !== "string" || msg.content.length > 2000) {
        return NextResponse.json(
          { error: "Each message content must be a string of 2000 characters or less" },
          { status: 400 }
        );
      }
      if (msg.role !== "user" && msg.role !== "assistant") {
        return NextResponse.json(
          { error: "Message role must be 'user' or 'assistant'" },
          { status: 400 }
        );
      }
    }

    const systemPrompt = body.context
      ? `${SYSTEM_PROMPT}\n\nCurrent context:\n${body.context}`
      : SYSTEM_PROMPT;

    const anthropic = new Anthropic({ apiKey });

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const readableStream = stream.toReadableStream();

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process chat request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
