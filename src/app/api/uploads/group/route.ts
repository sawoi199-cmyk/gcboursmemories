import { NextResponse } from "next/server";
import { z } from "zod";
import { createDraftEventsFromPhotos } from "@/features/uploads/create-draft-events";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const BodySchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, message: "Supabase is not configured." },
        { status: 503 },
      );
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const json: unknown = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid photoIds payload." },
        { status: 400 },
      );
    }

    const events = await createDraftEventsFromPhotos({
      ownerId: session.ownerId,
      photoIds: parsed.data.photoIds,
    });

    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Grouping failed.",
      },
      { status: 500 },
    );
  }
}
