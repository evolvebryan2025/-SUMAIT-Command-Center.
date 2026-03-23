"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Upload,
  Trash2,
  Download,
  FileText,
  Image,
  FileSpreadsheet,
  Film,
  Archive,
  File,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

interface TaskAttachmentsProps {
  taskId: string;
  readonly?: boolean;
}

const ACCEPTED_EXTENSIONS =
  ".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.mp4,.mov,.zip";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={16} />;
  if (mimeType.startsWith("video/")) return <Film size={16} />;
  if (mimeType === "application/pdf") return <FileText size={16} />;
  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown"
  )
    return <FileText size={16} />;
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv"
  )
    return <FileSpreadsheet size={16} />;
  if (mimeType === "application/zip") return <Archive size={16} />;
  return <File size={16} />;
}

function getFileTypeBadge(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "image/webp": "WebP",
    "application/pdf": "PDF",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "text/csv": "CSV",
    "text/plain": "TXT",
    "text/markdown": "MD",
    "video/mp4": "MP4",
    "video/quicktime": "MOV",
    "application/zip": "ZIP",
  };
  return map[mimeType] ?? "FILE";
}

export function TaskAttachments({ taskId, readonly = false }: TaskAttachmentsProps) {
  const { toast } = useToast();
  const { profile, isAdmin } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) {
        toast("Failed to load attachments", "error");
        return;
      }
      setAttachments(data ?? []);
    } catch {
      toast("Failed to load attachments", "error");
    } finally {
      setLoading(false);
    }
  }, [taskId, toast]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast(`"${file.name}" exceeds 10MB limit.`, "error");
        continue;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("taskId", taskId);

        const res = await fetch("/api/tasks/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          toast(data.error ?? "Upload failed.", "error");
          continue;
        }

        toast(`"${file.name}" uploaded`, "success");
        await fetchAttachments();
      } catch {
        toast("Upload failed. Please try again.", "error");
      } finally {
        setUploading(false);
      }
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    // Only admin or the uploader can delete
    if (!isAdmin && profile?.id !== attachment.uploaded_by) {
      toast("You can only delete your own attachments", "error");
      return;
    }

    setDeletingId(attachment.id);

    try {
      const supabase = createClient();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([attachment.storage_path]);

      if (storageError) {
        toast("Failed to delete file from storage", "error");
        setDeletingId(null);
        return;
      }

      // Delete from table
      const { error: dbError } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) {
        toast("Failed to delete attachment record", "error");
        setDeletingId(null);
        return;
      }

      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast("Attachment deleted", "success");
    } catch {
      toast("Failed to delete attachment", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[var(--color-text-secondary)]">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading attachments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Paperclip size={16} />
          <span className="text-sm font-medium">
            Attachments{attachments.length > 0 ? ` (${attachments.length})` : ""}
          </span>
        </div>

        {!readonly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {uploading ? "Uploading..." : "Attach File"}
            </Button>
          </>
        )}
      </div>

      {/* Attachment list */}
      {attachments.length === 0 ? (
        <p className="text-xs text-[var(--color-text-secondary)] py-2">
          No attachments yet.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-2.5 rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] group"
            >
              {/* File icon */}
              <div className="text-[var(--color-text-secondary)] shrink-0">
                {getFileIcon(attachment.file_type)}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)] truncate">
                  {attachment.file_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="neutral">
                    {getFileTypeBadge(attachment.file_type)}
                  </Badge>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {formatFileSize(attachment.file_size)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={attachment.file_name}
                  className="inline-flex items-center justify-center p-1.5 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <Download size={14} />
                </a>

                {!readonly &&
                  (isAdmin || profile?.id === attachment.uploaded_by) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(attachment)}
                      disabled={deletingId === attachment.id}
                      className="inline-flex items-center justify-center p-1.5 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
