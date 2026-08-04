import { NextResponse } from "next/server";
import { z } from "zod";
import { mergeMemoryEvents } from "@/features/memories/merge-split";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const BodySchema = z.object({
  targetId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const json: unknown = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
    }

    const result = await mergeMemoryEvents({
      ownerId: session.ownerId,
      targetId: parsed.data.targetId,
      sourceId: parsed.data.sourceId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Merge failed" },
      { status: 500 },
    );
  }
}
