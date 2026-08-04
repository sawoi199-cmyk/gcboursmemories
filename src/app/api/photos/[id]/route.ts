import { NextResponse } from "next/server";
import { deleteOrphanPhoto } from "@/features/photos/delete-orphan-photo";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const { id } = await context.params;
    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const result = await deleteOrphanPhoto({
      ownerId: session.ownerId,
      photoId: id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    const status =
      message === "Not found"
        ? 404
        : message.includes("still linked")
          ? 400
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
