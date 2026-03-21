import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/activity-logger";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: comments, error } = await supabase
      .from("task_comments")
      .select("*, profiles:author_id(name, avatar_url)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const commentIds = (comments ?? []).map((c: any) => c.id);
    const { data: reads } = commentIds.length > 0
      ? await supabase.from("comment_reads").select("comment_id").eq("user_id", user.id).in("comment_id", commentIds)
      : { data: [] };

    const readSet = new Set((reads ?? []).map((r: any) => r.comment_id));
    const enriched = (comments ?? []).map((c: any) => ({ ...c, is_read: readSet.has(c.id) }));

    return NextResponse.json({ comments: enriched });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { content, comment_type } = body;

    if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

    const validTypes = ["comment", "question", "blocker"];
    const safeType = validTypes.includes(comment_type) ? comment_type : "comment";

    const { data: comment, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        author_id: user.id,
        content: content.trim(),
        comment_type: safeType,
      })
      .select("*, profiles:author_id(name, avatar_url)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (safeType === "blocker") {
      await supabase.from("tasks").update({ status: "blocked" }).eq("id", taskId);
    }

    const { data: task } = await supabase.from("tasks").select("title, assigned_to").eq("id", taskId).single();
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin").eq("is_active", true);

    const { data: authorProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (authorProfile?.role === "member") {
      for (const admin of admins ?? []) {
        const notifType = safeType === "question" ? "question_posted" : safeType === "blocker" ? "blocker_raised" : "comment_reply";
        notify({
          supabase, userId: admin.id, title: `${safeType === "blocker" ? "Blocker" : safeType === "question" ? "Question" : "Comment"} on "${task?.title}"`,
          message: content.trim().slice(0, 200), type: notifType as any, entityType: "tasks", entityId: taskId,
          channels: ["in_app"],
        }).catch(console.error);
      }
    }
    if (authorProfile?.role === "admin" && task?.assigned_to && task.assigned_to !== user.id) {
      notify({
        supabase, userId: task.assigned_to, title: `Reply on "${task?.title}"`,
        message: content.trim().slice(0, 200), type: "comment_reply", entityType: "tasks", entityId: taskId,
        channels: ["in_app"],
      }).catch(console.error);
    }

    logActivity(supabase, "comment_created", "task_comment", comment.id, { task_id: taskId, comment_type: safeType }).catch(console.error);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { commentId, is_resolved } = body;

    if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

    const resolved = is_resolved !== false;
    const { data, error } = await supabase
      .from("task_comments")
      .update({
        is_resolved: resolved,
        resolved_by: resolved ? user.id : null,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .eq("id", commentId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ comment: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
