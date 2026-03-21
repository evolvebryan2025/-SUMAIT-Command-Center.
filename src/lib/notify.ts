import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/lib/types";
import { sendEmail } from "@/lib/email";
import { sendSlackNotification } from "@/lib/slack";

interface NotifyOptions {
  /** Supabase client for in-app notification insert */
  supabase: SupabaseClient;
  /** Target user ID for in-app notification */
  userId: string;
  /** Target user email (for email notifications) — optional */
  email?: string;
  /** Notification title */
  title: string;
  /** Notification body/message */
  message: string;
  /** Notification type */
  type: NotificationType;
  /** Entity type (e.g. "tasks", "clients") for deep links */
  entityType?: string;
  /** Entity ID for deep links */
  entityId?: string;
  /** Which channels to send to. Defaults to all configured channels. */
  channels?: Array<"in_app" | "email" | "slack">;
}

/**
 * Unified notification dispatcher — sends to in-app, email, and Slack
 * in parallel. Failures on one channel don't block others.
 */
export async function notify(options: NotifyOptions): Promise<{
  inApp: boolean;
  email: boolean;
  slack: boolean;
}> {
  const channels = options.channels ?? ["in_app", "email", "slack"];

  const results = await Promise.allSettled([
    // In-app notification (Supabase)
    channels.includes("in_app")
      ? createInAppNotification(options)
      : Promise.resolve(false),

    // Email notification (Resend)
    channels.includes("email") && options.email
      ? sendEmail({
          to: options.email,
          subject: options.title,
          body: options.message,
          type: options.type,
          entityType: options.entityType,
          entityId: options.entityId,
        })
      : Promise.resolve(false),

    // Slack notification
    channels.includes("slack")
      ? sendSlackNotification({
          title: options.title,
          message: options.message,
          type: options.type,
          entityType: options.entityType,
          entityId: options.entityId,
        })
      : Promise.resolve(false),
  ]);

  return {
    inApp: results[0].status === "fulfilled" && results[0].value === true,
    email: results[1].status === "fulfilled" && results[1].value === true,
    slack: results[2].status === "fulfilled" && results[2].value === true,
  };
}

/** Backward-compatible: simple in-app only notification */
export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  message: string | null,
  type: NotificationType,
  entityType?: string,
  entityId?: string
): Promise<void> {
  await createInAppNotification({
    supabase,
    userId,
    title,
    message: message ?? "",
    type,
    entityType,
    entityId,
  });
}

async function createInAppNotification(options: NotifyOptions): Promise<boolean> {
  const { error } = await options.supabase.from("notifications").insert({
    user_id: options.userId,
    title: options.title,
    message: options.message || null,
    type: options.type,
    entity_type: options.entityType ?? null,
    entity_id: options.entityId ?? null,
    is_read: false,
  });

  if (error) {
    console.error("[notify:in_app] Failed:", error.message);
    return false;
  }

  return true;
}
