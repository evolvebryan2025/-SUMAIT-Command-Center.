"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/providers/toast-provider";

interface AvatarUploadProps {
  currentUrl: string | null;
  userName: string;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ currentUrl, userName, onUploaded }: AvatarUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFile = useCallback(async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast("Invalid file type. Use JPEG, PNG, or WebP.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("File too large. Max 2MB.", "error");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        onUploaded(data.url);
        toast("Avatar updated", "success");
      } else {
        toast(data.error ?? "Upload failed", "error");
        setPreview(currentUrl);
      }
    } catch {
      toast("Upload failed", "error");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }, [currentUrl, onUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className="relative w-24 h-24 rounded-full cursor-pointer group"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {preview ? (
        <img src={preview} alt={userName} className="w-24 h-24 rounded-full object-cover" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-2xl font-bold">
          {initials}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading ? (
          <Loader2 size={20} className="text-white animate-spin" />
        ) : (
          <Camera size={20} className="text-white" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
