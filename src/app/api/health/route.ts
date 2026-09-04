import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return unhealthyResponse();
  }

  try {
    const { error } = await createServiceClient()
      .from("relationship_settings")
      .select("id")
      .limit(1);

    if (error) {
      return unhealthyResponse();
    }
  } catch {
    return unhealthyResponse();
  }

  return Response.json(
    {
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function unhealthyResponse() {
  return Response.json(
    {
      ok: false,
      status: "unhealthy",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
