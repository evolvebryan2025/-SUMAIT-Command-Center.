"use client";

interface ChatMessageProps {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: string;
}

function formatContent(raw: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Split by bold, code, and newlines
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\n)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{raw.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    if (token === "\n") {
      parts.push(<br key={key++} />);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-[rgba(255,255,255,0.1)] px-1.5 py-0.5 text-sm font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < raw.length) {
    parts.push(<span key={key++}>{raw.slice(lastIndex)}</span>);
  }

  return parts;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className="max-w-[85%]">
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-[var(--color-primary)] text-white rounded-2xl rounded-br-sm"
              : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text)] rounded-2xl rounded-bl-sm border border-[var(--color-border)]"
          }`}
        >
          {formatContent(content)}
        </div>
        <p
          className={`mt-1 text-[10px] text-[var(--color-text-secondary)] ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {timestamp}
        </p>
      </div>
    </div>
  );
}
