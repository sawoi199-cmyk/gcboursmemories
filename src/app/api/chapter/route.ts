import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAPTER_IDS } from "@/config/chapters";
import {
  CHAPTER_PAGE_SIZE,
  getPublishedChapterPage,
} from "@/features/memories/published";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const QuerySchema = z.object({
  chapter: z.enum(CHAPTER_IDS),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursorDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cursorId: z.string().uuid().optional(),
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
      chapter: url.searchParams.get("chapter") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursorDate: url.searchParams.get("cursorDate") ?? undefined,
      cursorId: url.searchParams.get("cursorId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid query" }, { status: 400 });
    }

    const { chapter, cursorDate, cursorId, limit } = parsed.data;
    if ((cursorDate && !cursorId) || (!cursorDate && cursorId)) {
      return NextResponse.json(
        { ok: false, message: "cursorDate and cursorId must be paired" },
        { status: 400 },
      );
    }

    const page = await getPublishedChapterPage({
      chapterId: chapter,
      limit: limit ?? CHAPTER_PAGE_SIZE,
      cursor: cursorDate && cursorId ? { eventDate: cursorDate, id: cursorId } : null,
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
