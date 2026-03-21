"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Undo, Check, Rocket, Send, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiReportEditorProps {
  reportId: string;
  initialHtml: string;
}

export function AiReportEditor({ reportId, initialHtml }: AiReportEditorProps) {
  const [currentHtml, setCurrentHtml] = useState(initialHtml);
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [instruction, setInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const clearStatus = useCallback(() => {
    const timer = setTimeout(() => setStatusMessage(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (statusMessage) {
      const cleanup = clearStatus();
      return cleanup;
    }
  }, [statusMessage, clearStatus]);

  const handleApply = async () => {
    if (!instruction.trim() || isEditing) return;

    setIsEditing(true);
    setStatusMessage(null);

    const newUserMessage: ChatMessage = {
      role: "user",
      content: instruction,
    };
    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setInstruction("");

    try {
      const res = await fetch("/api/ai/report-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: currentHtml,
          instruction: instruction.trim(),
          history: updatedHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "Edit failed" });
        return;
      }

      // Push current version to undo stack
      setHtmlHistory((prev) => [...prev, currentHtml]);
      setCurrentHtml(data.html);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "Changes applied successfully.",
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
    } catch {
      setStatusMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setIsEditing(false);
    }
  };

  const handleUndo = () => {
    if (htmlHistory.length === 0) return;
    const previous = htmlHistory[htmlHistory.length - 1];
    setHtmlHistory((prev) => prev.slice(0, -1));
    setCurrentHtml(previous);
    setChatHistory((prev) => [
      ...prev,
      { role: "assistant", content: "Reverted to previous version." },
    ]);
  };

  const handleApproveAndSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html_content: currentHtml,
          status: "approved",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({
          type: "error",
          text: data.error || "Save failed",
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: "Report approved and saved.",
      });
    } catch {
      setStatusMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/reports/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: currentHtml,
          title: `report-${reportId}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({
          type: "error",
          text: data.error || "Deploy failed",
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: `Deployed: ${data.url}`,
      });
    } catch {
      setStatusMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Status message */}
      {statusMessage && (
        <div
          className={`px-4 py-2 rounded-[var(--radius)] text-sm ${
            statusMessage.type === "success"
              ? "bg-green-900/30 text-green-300 border border-green-700"
              : "bg-red-900/30 text-red-300 border border-red-700"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUndo}
          disabled={htmlHistory.length === 0}
        >
          <Undo className="w-4 h-4" />
          Undo
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleApproveAndSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Approve & Save
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDeploy}
          disabled={isDeploying}
        >
          {isDeploying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          Deploy
        </Button>
      </div>

      {/* Main content: side-by-side on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left panel: preview */}
        <Card className="flex-1 min-h-[300px] lg:min-h-0 p-0 overflow-hidden">
          <iframe
            srcDoc={currentHtml}
            className="w-full h-full border-0"
            title="Report Preview"
            sandbox="allow-same-origin"
          />
        </Card>

        {/* Right panel: chat interface */}
        <Card className="flex flex-col w-full lg:w-[400px] min-h-[300px] lg:min-h-0 p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
            AI Editor
          </h3>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
            {chatHistory.length === 0 && (
              <p className="text-xs text-[var(--color-text-secondary)] italic">
                Describe changes you want to make to the report.
              </p>
            )}
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-[var(--radius)] ${
                  msg.role === "user"
                    ? "bg-[var(--color-primary)]/20 text-[var(--color-text)] ml-4"
                    : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] mr-4"
                }`}
              >
                {msg.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="flex gap-2 items-end">
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Change the header color to blue..."
              className="min-h-[60px] max-h-[120px] text-sm"
              disabled={isEditing}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={!instruction.trim() || isEditing}
              className="shrink-0"
            >
              {isEditing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
