import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const BUCKET_NAME = "chat-uploads";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `File type "${file.type}" is not allowed. Accepted: PNG, JPEG, WebP, PDF, MP4, MOV, TXT, MD, CSV`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be 10MB or less" },
        { status: 400 }
      );
    }

    // Build storage path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${timestamp}-${safeName}`;

    // Upload with admin client (bypasses RLS on storage)
    const admin = createAdminClient();
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

    // Insert record into chat_attachments table
    const { data: attachment, error: insertError } = await admin
      .from("chat_attachments")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select("id, file_name, file_url, file_type, file_size")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save attachment record: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ attachment });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
