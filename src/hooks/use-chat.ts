"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: string;
}

interface ChatState {
  readonly messages: readonly ChatMessage[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const MAX_MESSAGES = 50;
const STORAGE_KEY = "sumait-ai-chat";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadFromSession(): readonly ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToSession(messages: readonly ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Silently fail if storage is full
  }
}

function trimMessages(messages: readonly ChatMessage[]): readonly ChatMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  return messages.slice(messages.length - MAX_MESSAGES);
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  // Load from session on mount
  useEffect(() => {
    const stored = loadFromSession();
    if (stored.length > 0) {
      setState((prev) => ({ ...prev, messages: stored }));
    }
  }, []);

  // Save to session on message changes
  useEffect(() => {
    if (state.messages.length > 0) {
      saveToSession(state.messages);
    }
  }, [state.messages]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: formatTimestamp(),
    };

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: formatTimestamp(),
    };

    setState((prev) => {
      const updated = trimMessages([...prev.messages, userMessage]);
      return {
        messages: [...updated, assistantMessage],
        isLoading: true,
        error: null,
      };
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Build API message history (exclude the empty assistant message)
      const apiMessages = [...state.messages, userMessage]
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream available");
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE events from the Anthropic streaming format
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                accumulated += parsed.delta.text;
              }
            } catch {
              // Not JSON, treat as raw text
              accumulated += data;
            }
          }
        }

        // Update the assistant message content
        const currentContent = accumulated;
        setState((prev) => {
          const msgs = [...prev.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
            msgs[lastIdx] = { ...msgs[lastIdx], content: currentContent };
          }
          return { ...prev, messages: msgs };
        });
      }

      // Finalize
      setState((prev) => {
        const msgs = [...prev.messages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
          const finalContent = accumulated || "I apologize, but I could not generate a response. Please try again.";
          msgs[lastIdx] = {
            ...msgs[lastIdx],
            content: finalContent,
            timestamp: formatTimestamp(),
          };
        }
        return {
          messages: trimMessages(msgs),
          isLoading: false,
          error: null,
        };
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Failed to send message";
      setState((prev) => {
        // Remove the empty assistant message on error
        const msgs = prev.messages.filter(
          (m) => m.id !== assistantMessage.id
        );
        return { messages: msgs, isLoading: false, error: message };
      });
    } finally {
      abortRef.current = null;
    }
  }, [state.messages]);

  const clearChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setState({ messages: [], isLoading: false, error: null });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearChat,
  } as const;
}
