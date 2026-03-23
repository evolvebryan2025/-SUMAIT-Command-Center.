import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "text/markdown",
  "video/mp4",
  "video/quicktime",
  "application/zip",
]);

const ALLOWED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "webp",
  "pdf",
  "doc", "docx",
  "xls", "xlsx",
  "csv", "txt", "md",
  "mp4", "mov",
  "zip",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    // Validate file type by MIME and extension
    const ext = getExtension(file.name);
    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed: PNG, JPEG, WebP, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, MD, MP4, MOV, ZIP",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Verify the task exists
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Build storage path: {userId}/{taskId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${taskId}/${timestamp}-${safeName}`;

    // Read file buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("task-attachments")
      .getPublicUrl(storagePath);

    // Insert attachment record
    const { data: attachment, error: attachError } = await supabase
      .from("task_attachments")
      .insert({
        task_id: taskId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select("id, file_name, file_url, file_type, file_size")
      .single();

    if (attachError) {
      return NextResponse.json(
        { error: attachError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload attachment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
