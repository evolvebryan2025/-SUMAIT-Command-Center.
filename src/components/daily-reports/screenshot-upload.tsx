"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

interface ScreenshotUploadProps {
  itemId: string;
  reportId: string;
  onUpload: (attachment: { id: string; file_name: string; storage_path: string }) => void;
}

export function ScreenshotUpload({ itemId, reportId, onUpload }: ScreenshotUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds 5MB limit.`);
        continue;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("item_id", itemId);
        formData.append("report_id", reportId);

        const res = await fetch("/api/daily-reports/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Upload failed.");
          continue;
        }

        const attachment = await res.json();

        const previewUrl = URL.createObjectURL(file);
        setPreviews((prev) => [
          ...prev,
          { id: attachment.id, url: previewUrl, name: file.name },
        ]);

        onUpload(attachment);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePreview = (id: string) => {
    setPreviews((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview) => (
            <div key={preview.id} className="relative group">
              <img
                src={preview.url}
                alt={preview.name}
                className="w-16 h-16 object-cover rounded-[var(--radius)] border border-[var(--color-border)]"
              />
              <button
                type="button"
                onClick={() => handleRemovePreview(preview.id)}
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          capture="environment"
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
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? "Uploading..." : "Screenshot"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
