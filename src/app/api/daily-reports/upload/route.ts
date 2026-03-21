import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
    const itemId = formData.get("itemId") as string | null;
    const reportId = formData.get("reportId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!itemId || !reportId) {
      return NextResponse.json(
        { error: "itemId and reportId are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: png, jpg, webp" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("daily_reports")
      .select("id, user_id, report_date")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    if (report.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Build storage path: {userId}/{date}/{filename}
    const storagePath = `${user.id}/${report.report_date}/${file.name}`;

    // Read file buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("daily-reports")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("daily-reports")
      .getPublicUrl(storagePath);

    // Insert attachment record
    const { data: attachment, error: attachError } = await supabase
      .from("daily_report_attachments")
      .insert({
        item_id: itemId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
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
