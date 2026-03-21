import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("activity_log").insert({
    user_id: user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Failed to log activity:", error.message);
  }
}
