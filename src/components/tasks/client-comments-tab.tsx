"use client";

import { useEffect, useState, useRef } from "react";
import { Send, User, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientCommentData {
  id: string;
  author_type: "client" | "admin";
  author_name: string;
  content: string;
  created_at: string;
}

export function ClientCommentsTab({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<ClientCommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/portal/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSend() {
    if (!content.trim() || sending) return;
    setSending(true);

    const res = await fetch(`/api/portal/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });

    const data = await res.json();
    if (data.comment) {
      setComments((prev) => [...prev, {
        ...data.comment,
        author_name: "You (Admin)",
        author_type: "admin",
      }]);
      setContent("");
    }
    setSending(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Client Thread</h4>
        {comments.filter((c) => c.author_type === "client").length > 0 && (
          <Badge variant="danger">
            {comments.filter((c) => c.author_type === "client").length} client messages
          </Badge>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-xs text-[var(--color-text-secondary)]">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No client messages yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                c.author_type === "client" ? "bg-blue-500/20" : "bg-amber-500/20"
              }`}>
                {c.author_type === "client"
                  ? <User size={12} className="text-blue-400" />
                  : <Crown size={12} className="text-amber-400" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--color-text)]">
                    {c.author_name}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{c.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Reply to client..."
          className="flex-1 min-h-[50px] text-sm px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="self-end px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
