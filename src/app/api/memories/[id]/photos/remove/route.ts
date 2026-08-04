import { NextResponse } from "next/server";
import {
  RemovePhotosBodySchema,
  removePhotosFromEvent,
} from "@/features/memories/remove-photos";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const { id } = await context.params;
    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const json: unknown = await request.json();
    const parsed = RemovePhotosBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
    }

    const result = await removePhotosFromEvent({
      ownerId: session.ownerId,
      memoryId: id,
      photoIds: parsed.data.photoIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Remove failed";
    const status =
      message === "Not found"
        ? 404
        : message.includes("至少保留") || message.includes("not on this memory")
          ? 400
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
