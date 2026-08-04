import { NextResponse } from "next/server";
import { unpublishMemoryEvent } from "@/features/memories/publish-memory";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const { id } = await context.params;
    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const result = await unpublishMemoryEvent({ ownerId: session.ownerId, memoryId: id });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unpublish failed" },
      { status: 400 },
    );
  }
}
