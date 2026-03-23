import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are the SUMAIT Command Center assistant for Bryan Sumait (CEO).
You can both READ and WRITE data in the Command Center.

CAPABILITIES:
- Answer questions about tasks, team, clients, daily reports, and operations
- Create new tasks (assign to team members, set priority, client, due date)
- Update existing tasks (change status, priority, assignee, description)
- Delete tasks
- Look up team members, clients, and their data

GUIDELINES:
- Be concise and direct. Bryan prefers short answers with bullet points.
- When creating tasks, confirm what you created with the task details.
- When referencing tasks or clients, include their status and any deadlines.
- Never fabricate data. If information isn't available, say so.
- When a user says "for Bryan" or "for me", assign to Bryan's profile.
- Use the tools provided to take actions. Don't say you can't do something if a tool exists for it.`;

// Tool definitions for task management
const TOOLS: Anthropic.Tool[] = [
  {
    name: "create_task",
    description: "Create a new task in the Command Center. Use when the user asks to create, add, or make a task.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description (optional)" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Task priority" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"], description: "Task status, defaults to pending" },
        assigned_to_name: { type: "string", description: "Name of the person to assign the task to (e.g. 'Bryan', 'Lee', 'John')" },
        client_name: { type: "string", description: "Client name to associate the task with (optional)" },
        due_date: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update an existing task. Use when the user asks to change, update, edit, or modify a task's status, priority, assignee, or other fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_title: { type: "string", description: "Title or partial title of the task to find and update" },
        task_id: { type: "string", description: "Task UUID if known (preferred over title search)" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"] },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        assigned_to_name: { type: "string", description: "Name of person to reassign to" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        due_date: { type: "string", description: "New due date (YYYY-MM-DD)" },
      },
      required: [],
    },
  },
  {
    name: "delete_task",
    description: "Delete a task permanently. Use when the user asks to delete or remove a task.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_title: { type: "string", description: "Title or partial title of the task to delete" },
        task_id: { type: "string", description: "Task UUID if known" },
      },
      required: [],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks with optional filters. Use to look up current tasks before creating or updating.",
    input_schema: {
      type: "object" as const,
      properties: {
        assigned_to_name: { type: "string", description: "Filter by assignee name" },
        client_name: { type: "string", description: "Filter by client name" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"] },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: [],
    },
  },
];

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// Resolve a person's name to their profile ID
async function resolveProfileId(admin: SupabaseClient, name: string): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .eq("is_active", true)
    .limit(1);
  return data?.[0]?.id ?? null;
}

// Resolve a client name to their ID
async function resolveClientId(admin: SupabaseClient, name: string): Promise<string | null> {
  const { data } = await admin
    .from("clients")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .limit(1);
  return data?.[0]?.id ?? null;
}

// Execute tool calls
async function executeTool(
  toolName: string,
  input: Record<string, any>,
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  switch (toolName) {
    case "create_task": {
      const taskData: Record<string, any> = {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        status: input.status ?? "pending",
        created_by: userId,
      };

      if (input.assigned_to_name) {
        const profileId = await resolveProfileId(admin, input.assigned_to_name);
        if (profileId) {
          taskData.assigned_to = profileId;
        } else {
          return JSON.stringify({ error: `Could not find team member "${input.assigned_to_name}"` });
        }
      }

      if (input.client_name) {
        const clientId = await resolveClientId(admin, input.client_name);
        if (clientId) {
          taskData.client_id = clientId;
        } else {
          return JSON.stringify({ error: `Could not find client "${input.client_name}"` });
        }
      }

      if (input.due_date) {
        taskData.due_date = input.due_date;
      }

      const { data, error } = await admin.from("tasks").insert(taskData).select("id, title, status, priority, due_date").single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, task: data });
    }

    case "update_task": {
      // Find the task
      let taskId = input.task_id;
      if (!taskId && input.task_title) {
        const { data: found } = await admin
          .from("tasks")
          .select("id, title")
          .ilike("title", `%${input.task_title}%`)
          .neq("status", "completed")
          .limit(1);
        taskId = found?.[0]?.id;
        if (!taskId) return JSON.stringify({ error: `Could not find task matching "${input.task_title}"` });
      }
      if (!taskId) return JSON.stringify({ error: "No task_id or task_title provided" });

      const updates: Record<string, any> = {};
      if (input.status) updates.status = input.status;
      if (input.priority) updates.priority = input.priority;
      if (input.title) updates.title = input.title;
      if (input.description) updates.description = input.description;
      if (input.due_date) updates.due_date = input.due_date;
      if (input.status === "completed") updates.completed_at = new Date().toISOString();

      if (input.assigned_to_name) {
        const profileId = await resolveProfileId(admin, input.assigned_to_name);
        if (profileId) updates.assigned_to = profileId;
        else return JSON.stringify({ error: `Could not find team member "${input.assigned_to_name}"` });
      }

      if (Object.keys(updates).length === 0) return JSON.stringify({ error: "No fields to update" });

      const { data, error } = await admin.from("tasks").update(updates).eq("id", taskId).select("id, title, status, priority, due_date").single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, task: data });
    }

    case "delete_task": {
      let taskId = input.task_id;
      if (!taskId && input.task_title) {
        const { data: found } = await admin
          .from("tasks")
          .select("id, title")
          .ilike("title", `%${input.task_title}%`)
          .limit(1);
        taskId = found?.[0]?.id;
        if (!taskId) return JSON.stringify({ error: `Could not find task matching "${input.task_title}"` });
      }
      if (!taskId) return JSON.stringify({ error: "No task_id or task_title provided" });

      const { error } = await admin.from("tasks").delete().eq("id", taskId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, message: "Task deleted" });
    }

    case "list_tasks": {
      let query = admin
        .from("tasks")
        .select("id, title, status, priority, due_date, assigned_to, client_id, profiles:assigned_to(name), clients:client_id(name)")
        .neq("status", "completed")
        .order("due_date", { ascending: true })
        .limit(input.limit ?? 20);

      if (input.status) query = query.eq("status", input.status);

      if (input.assigned_to_name) {
        const profileId = await resolveProfileId(admin, input.assigned_to_name);
        if (profileId) query = query.eq("assigned_to", profileId);
      }

      if (input.client_name) {
        const clientId = await resolveClientId(admin, input.client_name);
        if (clientId) query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });

      const tasks = (data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        assigned_to: t.profiles?.name ?? "Unassigned",
        client: t.clients?.name ?? null,
      }));

      return JSON.stringify({ tasks, count: tasks.length });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// Build context for the AI (same as before)
async function getContextForQuery(supabase: SupabaseClient, query: string): Promise<string> {
  const sections: string[] = [];
  const q = query.toLowerCase();

  // Team members list (always include for context)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, role, is_active")
    .eq("is_active", true);

  if (profiles && profiles.length > 0) {
    const memberList = profiles.map((p: any) => `- ${p.name} (${p.role})`).join("\n");
    sections.push(`## Team Members\n${memberList}`);
  }

  // Client names (always include for reference)
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, status, health_score")
    .in("status", ["active", "paused"])
    .order("name")
    .limit(30);

  if (clients && clients.length > 0) {
    const clientList = clients.map((c: any) => `- ${c.name} [${c.status}, health: ${c.health_score}]`).join("\n");
    sections.push(`## Clients\n${clientList}`);
  }

  // Client name mentions — fetch tasks for that client
  const clientNames = ["prince", "kyle", "joshua", "juan", "thomas", "blake", "kevin", "sebastian", "candy"];
  const mentionedClient = clientNames.find((n) => q.includes(n));
  if (mentionedClient) {
    const { data: matchedClients } = await supabase
      .from("clients")
      .select("id, name")
      .ilike("name", `%${mentionedClient}%`);

    if (matchedClients && matchedClients.length > 0) {
      const clientIds = matchedClients.map((c: any) => c.id);
      const { data: clientTasks } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, profiles:assigned_to(name)")
        .in("client_id", clientIds)
        .neq("status", "completed")
        .order("due_date", { ascending: true })
        .limit(30);

      if (clientTasks && clientTasks.length > 0) {
        const taskLines = clientTasks.map((t: any) =>
          `- ${t.title} [${t.status}, ${t.priority}] → ${t.profiles?.name ?? "Unassigned"}${t.due_date ? ` due ${t.due_date}` : ""}`
        );
        sections.push(`## Tasks for ${matchedClients.map((c: any) => c.name).join(", ")}\n${taskLines.join("\n")}`);
      }
    }
  }

  // Quick stats
  const { count: taskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .neq("status", "completed");
  const { count: alertCount } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("is_resolved", false);

  sections.push(`## Stats\n- Open tasks: ${taskCount ?? 0}\n- Unresolved alerts: ${alertCount ?? 0}`);

  return sections.join("\n\n").slice(0, 12000);
}

interface MessageInput {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: MessageInput[];
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Rate limit exceeded. Max 20 requests per minute." }, { status: 429 });
    }

    const body: RequestBody = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    for (const msg of body.messages) {
      if (typeof msg.content !== "string" || msg.content.length > 2000) {
        return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
      }
      if (msg.role !== "user" && msg.role !== "assistant") {
        return NextResponse.json({ error: "Invalid message role" }, { status: 400 });
      }
    }

    // Get context
    const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
    const context = lastUserMsg ? await getContextForQuery(supabase, lastUserMsg.content) : "";
    const systemPrompt = context
      ? `${SYSTEM_PROMPT}\n\nCurrent data from Command Center:\n${context}`
      : SYSTEM_PROMPT;

    const anthropic = new Anthropic({ apiKey });
    const admin = createAdminClient();

    // Agentic loop: call Claude, execute tools, call again until done
    let messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let finalText = "";
    const maxIterations = 5;

    for (let i = 0; i < maxIterations; i++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });

      // Extract text and tool use blocks
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      const toolBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

      // Accumulate text
      finalText += textBlocks.map((b) => b.text).join("");

      // If no tool calls, we're done
      if (toolBlocks.length === 0 || response.stop_reason !== "tool_use") {
        break;
      }

      // Execute tool calls and build tool results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tool of toolBlocks) {
        const result = await executeTool(tool.name, tool.input as Record<string, any>, admin, user.id);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: result,
        });
      }

      // Add assistant response + tool results to conversation
      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    }

    // Stream the final text back as SSE (to match client-side parser)
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        // Send the full text as a single content_block_delta event
        if (finalText) {
          const event = { type: "content_block_delta", delta: { text: finalText } };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
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
