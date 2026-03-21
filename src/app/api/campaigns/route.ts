import { type NextRequest } from "next/server";
import { getInstantlyApiKey, instantlyHeaders, INSTANTLY_BASE } from "@/lib/instantly";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") || "100";
    const status = searchParams.get("status");
    const accountId = searchParams.get("accountId");

    const apiKey = await getInstantlyApiKey(accountId);

    // Instantly API v2 does NOT support status query param — fetch all, filter here
    const url = `${INSTANTLY_BASE}/campaigns?limit=${limit}`;

    const res = await fetch(url, {
      headers: instantlyHeaders(apiKey),
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json(
        { error: `Instantly API error: ${res.status} - ${errorText}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Filter by status server-side if requested
    if (status && status !== "all") {
      const items: Record<string, unknown>[] = Array.isArray(data) ? data : data.items ?? data.data ?? [];
      const filtered = items.filter(
        (c) => typeof c.status === "string" && c.status.toLowerCase() === status.toLowerCase(),
      );
      return Response.json(filtered);
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch campaigns";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const accountId = body.accountId;
    delete body.accountId;

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return Response.json({ error: "Campaign name is required" }, { status: 400 });
    }

    const apiKey = await getInstantlyApiKey(accountId);

    const res = await fetch(`${INSTANTLY_BASE}/campaigns`, {
      method: "POST",
      headers: instantlyHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json(
        { error: `Instantly API error: ${res.status} - ${errorText}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return Response.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return Response.json({ error: message }, { status: 500 });
  }
}
