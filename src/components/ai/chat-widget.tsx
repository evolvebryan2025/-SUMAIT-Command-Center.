"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X, Trash2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useUser } from "@/hooks/use-user";
import { ChatMessage } from "./chat-message";

const MAX_INPUT_LENGTH = 2000;

export function ChatWidget() {
  const { isAdmin, loading } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const charCount = input.length;
  const isOverLimit = charCount > MAX_INPUT_LENGTH;

  if (loading || !isAdmin) return null;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl ${
          !isOpen ? "animate-pulse" : ""
        }`}
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        } bottom-24 right-6 w-[400px] max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full max-sm:rounded-none`}
      >
        <div className="flex h-[500px] max-sm:h-[100dvh] flex-col bg-[var(--color-surface)] border border-[var(--color-border)] backdrop-blur-xl rounded-2xl max-sm:rounded-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  SUMAIT AI
                </h3>
                <p className="text-[10px] text-[var(--color-text-secondary)]">
                  {isLoading ? "Thinking..." : "Online"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-[var(--color-text)]"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-[var(--color-text)]"
                aria-label="Minimize chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)]">
                  <MessageSquare className="h-6 w-6 text-[var(--color-text-secondary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  How can I help?
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Ask about clients, tasks, or team activity.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}
            {/* Typing indicator */}
            {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              messages[messages.length - 1].content === "" && (
                <div className="flex justify-start mb-3">
                  <div className="bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-secondary)] [animation-delay:0ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-secondary)] [animation-delay:150ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-secondary)] [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            {error && (
              <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  maxLength={MAX_INPUT_LENGTH}
                  className="w-full resize-none rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  style={{ maxHeight: "120px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isOverLimit}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                Shift+Enter for new line
              </p>
              <p
                className={`text-[10px] ${
                  isOverLimit
                    ? "text-red-400"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {charCount}/{MAX_INPUT_LENGTH}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
