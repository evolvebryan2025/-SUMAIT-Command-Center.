import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notify";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: comments, error } = await supabase
    .from("client_comments")
    .select("id, task_id, author_id, author_type, content, created_at, profiles:author_id(name, role)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map author names: admin/lead/member show as "Support", client shows real name
  const safeComments = (comments ?? []).map((c: Record<string, unknown>) => {
    const profile = c.profiles as Record<string, unknown> | null;
    const role = profile?.role as string | undefined;
    const isAdminRole = role === "admin" || role === "lead" || role === "member";

    return {
      id: c.id,
      task_id: c.task_id,
      author_type: c.author_type,
      author_name: isAdminRole ? "Support" : (profile?.name ?? "Client"),
      content: c.content,
      created_at: c.created_at,
    };
  });

  return NextResponse.json({ comments: safeComments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const content = (body.content ?? "").trim();

  if (!content) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  // Determine author type from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const authorType =
    profile.role === "client" ? "client" : "admin";

  const { data: comment, error } = await supabase
    .from("client_comments")
    .insert({
      task_id: taskId,
      author_id: user.id,
      author_type: authorType,
      content,
      attachments: [],
    })
    .select("id, task_id, author_type, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If a client posted, notify admins and assigned employee
  if (authorType === "client") {
    const admin = createAdminClient();

    // Look up the task to find assigned_to
    const { data: task } = await admin
      .from("tasks")
      .select("assigned_to, title")
      .eq("id", taskId)
      .single();

    // Find all admin profiles
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true);

    const notifyIds = new Set<string>();

    // Add all admins
    for (const a of admins ?? []) {
      notifyIds.add(a.id);
    }

    // Add assigned employee if exists
    if (task?.assigned_to) {
      notifyIds.add(task.assigned_to);
    }

    // Remove the comment author
    notifyIds.delete(user.id);

    const taskTitle = task?.title ?? "a task";

    // Send notifications in parallel
    await Promise.allSettled(
      Array.from(notifyIds).map((uid) =>
        createNotification(
          admin,
          uid,
          "New client comment",
          `${profile.name} commented on "${taskTitle}"`,
          "client_comment",
          "tasks",
          taskId
        )
      )
    );
  }

  return NextResponse.json({
    comment: {
      ...comment,
      author_name: authorType === "client" ? profile.name : "Support",
    },
  });
}
