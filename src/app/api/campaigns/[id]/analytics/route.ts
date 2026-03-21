import { type NextRequest } from "next/server";
import { getInstantlyApiKey, instantlyHeaders, INSTANTLY_BASE } from "@/lib/instantly";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const accountId = request.nextUrl.searchParams.get("accountId");
    const apiKey = await getInstantlyApiKey(accountId);

    const res = await fetch(`${INSTANTLY_BASE}/campaigns/${id}/analytics`, {
      headers: instantlyHeaders(apiKey),
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json(
        { error: `Instantly API error: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch analytics";
    return Response.json({ error: message }, { status: 500 });
  }
}
