"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, CheckCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { COMMENT_TYPE_LABELS } from "@/lib/constants";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ClientCommentsTab } from "./client-comments-tab";
import type { TaskComment, CommentType } from "@/lib/types";

/** Extended type when the API enriches comments with read status */
interface EnrichedComment extends TaskComment {
  is_read?: boolean;
}

interface TaskCommentsProps {
  taskId: string;
}

const COMMENT_TYPE_VARIANTS: Record<string, "neutral" | "warning" | "danger"> = {
  comment: "neutral",
  question: "warning",
  blocker: "danger",
};

type TabId = "internal" | "client";

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { toast } = useToast();
  const { profile, isAdmin } = useUser();
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("comment");
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("internal");
  const [clientCommentCount, setClientCommentCount] = useState(0);
  const readMarkedRef = useRef(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to load comments", "error");
        return;
      }
      setComments(data);
    } catch {
      toast("Failed to load comments", "error");
    } finally {
      setLoading(false);
    }
  }, [taskId, toast]);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Mark all unread comments as read on mount
  useEffect(() => {
    if (readMarkedRef.current) return;
    readMarkedRef.current = true;

    fetch(`/api/tasks/${taskId}/comments/read`, { method: "POST" }).catch(
      () => {}
    );
  }, [taskId]);

  // Supabase Realtime subscription for live updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchComments]);

  // Fetch client comment count for badge
  useEffect(() => {
    fetch(`/api/portal/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        const clientMessages = (d.comments ?? []).filter(
          (c: { author_type: string }) => c.author_type === "client"
        );
        setClientCommentCount(clientMessages.length);
      })
      .catch(() => {});
  }, [taskId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!trimmed) return;

      setSubmitting(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed, comment_type: commentType }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error ?? "Failed to post comment", "error");
          return;
        }
        setContent("");
        setCommentType("comment");
        await fetchComments();
      } catch {
        toast("Failed to post comment", "error");
      } finally {
        setSubmitting(false);
      }
    },
    [content, commentType, taskId, toast, fetchComments]
  );

  const handleResolve = useCallback(
    async (commentId: string) => {
      setResolvingId(commentId);
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment_id: commentId, is_resolved: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error ?? "Failed to resolve comment", "error");
          return;
        }
        await fetchComments();
      } catch {
        toast("Failed to resolve comment", "error");
      } finally {
        setResolvingId(null);
      }
    },
    [taskId, toast, fetchComments]
  );

  const getAuthorInitial = (comment: EnrichedComment): string => {
    const name = comment.profiles?.name;
    if (name) return name.charAt(0).toUpperCase();
    return "?";
  };

  const getAuthorName = (comment: EnrichedComment): string => {
    return comment.profiles?.name ?? "Unknown";
  };

  if (loading) {
    return (
      <div className="space-y-2 py-4">
        <div className="h-4 w-24 bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
        <div className="h-16 w-full bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setActiveTab("internal")}
          className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "internal"
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          }`}
        >
          Internal ({comments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("client")}
          className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "client"
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          }`}
        >
          Client
          {clientCommentCount > 0 && (
            <Badge variant="danger">{clientCommentCount}</Badge>
          )}
        </button>
      </div>

      {activeTab === "client" && <ClientCommentsTab taskId={taskId} />}

      {activeTab === "internal" && <>
      <h4 className="text-sm font-semibold text-[var(--color-text)]">
        Comments ({comments.length})
      </h4>

      {/* Comment thread */}
      {comments.length > 0 && (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {comments.map((comment) => {
            const canResolve =
              isAdmin &&
              !comment.is_resolved &&
              (comment.comment_type === "question" ||
                comment.comment_type === "blocker");

            return (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-[var(--radius)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)]"
              >
                {/* Avatar circle */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-xs font-bold">
                  {getAuthorInitial(comment)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {getAuthorName(comment)}
                    </span>
                    <Badge variant={COMMENT_TYPE_VARIANTS[comment.comment_type] ?? "neutral"}>
                      {COMMENT_TYPE_LABELS[comment.comment_type] ?? comment.comment_type}
                    </Badge>
                    {comment.is_resolved && (
                      <Badge variant="active">Resolved</Badge>
                    )}
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                    {comment.is_read && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--color-text-secondary)]">
                        <Eye size={12} />
                        Seen
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[var(--color-text)] mt-1 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>

                  {canResolve && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1.5 text-xs"
                      disabled={resolvingId === comment.id}
                      onClick={() => handleResolve(comment.id)}
                    >
                      <CheckCircle size={14} />
                      {resolvingId === comment.id ? "Resolving..." : "Resolve"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)] py-2">
          No comments yet. Be the first to add one.
        </p>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="!min-h-[70px]"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap max-sm:flex-col max-sm:items-stretch">
          {/* Comment type selector */}
          <div className="flex gap-1.5 max-sm:w-full">
            {(["comment", "question", "blocker"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={commentType === type ? "primary" : "secondary"}
                onClick={() => setCommentType(type)}
                className="max-sm:flex-1 max-sm:py-2.5"
              >
                {COMMENT_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>

          <Button type="submit" size="sm" disabled={submitting || !content.trim()} className="max-sm:w-full max-sm:py-2.5">
            <Send size={14} />
            {submitting ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
      </>}
    </div>
  );
}
