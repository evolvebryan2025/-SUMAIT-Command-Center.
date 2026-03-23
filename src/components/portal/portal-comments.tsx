"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, User, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePortalBranding } from "@/hooks/use-portal-branding";

interface Comment {
  id: string;
  task_id: string;
  author_type: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface PortalCommentsProps {
  taskId: string;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) +
    " at " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
}

export function PortalComments({ taskId }: PortalCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { branding } = usePortalBranding();

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/portal/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
      setLoading(false);
    }
    load();
  }, [taskId]);

  useEffect(() => {
    // Subscribe to realtime inserts
    const supabase = createClient();
    const channel = supabase
      .channel(`client_comments:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_comments",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          // Refetch to get safe author names
          fetch(`/api/portal/tasks/${taskId}/comments`)
            .then((r) => r.json())
            .then((data) => setComments(data.comments ?? []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const res = await fetch(`/api/portal/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });

    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setInput("");
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col rounded-lg border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div
        className="px-4 py-3 border-b text-sm font-medium"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          color: branding.text_color,
        }}
      >
        Comments
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ maxHeight: 400, minHeight: 200 }}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div
              className="animate-pulse text-sm opacity-40"
              style={{ color: branding.text_color }}
            >
              Loading comments...
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm opacity-40" style={{ color: branding.text_color }}>
              No comments yet. Start a conversation below.
            </p>
          </div>
        ) : (
          comments.map((c) => {
            const isSupport = c.author_type === "admin";
            return (
              <div key={c.id} className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: isSupport
                      ? `${branding.accent_color}20`
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  {isSupport ? (
                    <Headphones size={14} style={{ color: branding.accent_color }} />
                  ) : (
                    <User size={14} style={{ color: branding.text_color, opacity: 0.6 }} />
                  )}
                </div>

                {/* Bubble */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-medium"
                      style={{ color: branding.text_color }}
                    >
                      {c.author_name}
                    </span>
                    <span
                      className="text-[10px] opacity-40"
                      style={{ color: branding.text_color }}
                    >
                      {formatTimestamp(c.created_at)}
                    </span>
                  </div>
                  <p
                    className="text-sm whitespace-pre-wrap"
                    style={{ color: branding.text_color, opacity: 0.85 }}
                  >
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div
        className="border-t px-4 py-3 flex items-end gap-2"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm outline-none focus:border-opacity-30 transition-colors"
          style={{
            color: branding.text_color,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30 cursor-pointer"
          style={{
            backgroundColor: branding.accent_color,
            color: "#fff",
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
