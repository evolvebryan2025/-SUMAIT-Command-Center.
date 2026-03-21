import { createClient } from "@/lib/supabase/server";

const INSTANTLY_BASE = "https://api.instantly.ai/api/v2";

export interface InstantlyAccount {
  id: string;
  name: string;
  api_key: string;
  email: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get the Instantly API key for a given account ID.
 * Falls back to: specific account → default account → env var.
 */
export async function getInstantlyApiKey(accountId?: string | null): Promise<string> {
  const supabase = await createClient();

  if (accountId) {
    const { data } = await supabase
      .from("instantly_accounts")
      .select("api_key")
      .eq("id", accountId)
      .single();
    if (data?.api_key) return data.api_key;
  }

  // Try default account
  const { data: defaultAccount } = await supabase
    .from("instantly_accounts")
    .select("api_key")
    .eq("is_default", true)
    .single();
  if (defaultAccount?.api_key) return defaultAccount.api_key;

  // Fall back to env var
  const envKey = process.env.INSTANTLY_API_KEY;
  if (envKey) return envKey;

  throw new Error("No Instantly API key configured. Add an account in Settings → Instantly Accounts.");
}

export function instantlyHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export { INSTANTLY_BASE };
