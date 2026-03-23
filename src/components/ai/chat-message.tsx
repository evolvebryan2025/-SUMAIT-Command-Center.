"use client";

import { Download, FileText } from "lucide-react";

interface ChatMessageProps {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: string;
}

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp)$/i;

interface AttachmentInfo {
  readonly fileName: string;
  readonly url: string;
  readonly isImage: boolean;
}

function parseAttachments(raw: string): {
  textParts: string[];
  attachments: AttachmentInfo[];
} {
  const attachmentRegex = /\[Attached:\s*([^\]]+)\]\(([^)]+)\)/g;
  const textParts: string[] = [];
  const attachments: AttachmentInfo[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = attachmentRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      textParts.push(raw.slice(lastIndex, match.index));
    }
    attachments.push({
      fileName: match[1].trim(),
      url: match[2].trim(),
      isImage: IMAGE_EXTENSIONS.test(match[1].trim()),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    textParts.push(raw.slice(lastIndex));
  }

  return { textParts, attachments };
}

function formatContent(raw: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
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

function AttachmentCard({ attachment }: { readonly attachment: AttachmentInfo }) {
  if (attachment.isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="max-w-[200px] rounded-lg border border-[var(--color-border)]"
        />
        <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
          {attachment.fileName}
        </span>
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] px-3 py-2 hover:bg-[rgba(255,255,255,0.08)] transition-colors max-w-[200px]"
    >
      <FileText className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
      <span className="text-xs text-[var(--color-text)] truncate flex-1">
        {attachment.fileName}
      </span>
      <Download className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-secondary)]" />
    </a>
  );
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";
  const { textParts, attachments } = parseAttachments(content);
  const combinedText = textParts.join("").trim();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className="max-w-[85%]">
        {combinedText && (
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? "bg-[var(--color-primary)] text-white rounded-2xl rounded-br-sm"
                : "bg-[rgba(255,255,255,0.05)] text-[var(--color-text)] rounded-2xl rounded-bl-sm border border-[var(--color-border)]"
            }`}
          >
            {formatContent(combinedText)}
          </div>
        )}
        {attachments.map((att, i) => (
          <AttachmentCard key={`${att.fileName}-${i}`} attachment={att} />
        ))}
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
