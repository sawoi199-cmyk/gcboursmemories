import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAPTER_IDS } from "@/config/chapters";
import {
  TIMELINE_PAGE_SIZE,
  getPublishedTimelinePage,
} from "@/features/memories/published";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursorDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cursorId: z.string().uuid().optional(),
  chapter: z.enum(CHAPTER_IDS).optional(),
  hasPlace: z
    .enum(["1", "true", "0", "false"])
    .optional()
    .transform((value) => value === "1" || value === "true"),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      cursorDate: url.searchParams.get("cursorDate") ?? undefined,
      cursorId: url.searchParams.get("cursorId") ?? undefined,
      chapter: url.searchParams.get("chapter") ?? undefined,
      hasPlace: url.searchParams.get("hasPlace") ?? undefined,
      eventDate: url.searchParams.get("eventDate") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid query" }, { status: 400 });
    }

    const { cursorDate, cursorId, limit, chapter, hasPlace, eventDate } = parsed.data;
    if ((cursorDate && !cursorId) || (!cursorDate && cursorId)) {
      return NextResponse.json(
        { ok: false, message: "cursorDate and cursorId must be paired" },
        { status: 400 },
      );
    }

    const page = await getPublishedTimelinePage({
      limit: limit ?? TIMELINE_PAGE_SIZE,
      cursor: cursorDate && cursorId ? { eventDate: cursorDate, id: cursorId } : null,
      filters: {
        chapter,
        hasPlace: hasPlace || undefined,
        eventDate,
      },
    });

    return NextResponse.json({
      ok: true,
      memories: page.memories,
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Load failed" },
      { status: 500 },
    );
  }
}
