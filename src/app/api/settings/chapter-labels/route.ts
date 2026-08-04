import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAPTER_IDS, resolveChapterLabels, type ChapterId } from "@/config/chapters";
import { revalidatePublishedArchive } from "@/features/memories/published";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const BodySchema = z.object({
  labels: z.record(z.string(), z.string().max(40)),
});

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }
    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("relationship_settings")
      .select("chapter_labels")
      .eq("owner_id", session.ownerId)
      .maybeSingle();

    const labels = resolveChapterLabels(
      (data?.chapter_labels as Partial<Record<ChapterId, string>> | null) ?? null,
    );
    return NextResponse.json({ ok: true, labels });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Load failed" },
      { status: 500 },
    );
  }
}

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

    const custom: Partial<Record<ChapterId, string>> = {};
    for (const id of CHAPTER_IDS) {
      const value = parsed.data.labels[id]?.trim();
      if (value) custom[id] = value.slice(0, 40);
    }
    const labels = resolveChapterLabels(custom);

    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("relationship_settings")
      .select("id")
      .eq("owner_id", session.ownerId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("relationship_settings")
        .update({ chapter_labels: labels })
        .eq("id", existing.id)
        .eq("owner_id", session.ownerId);
      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("relationship_settings").insert({
        owner_id: session.ownerId,
        relationship_title: "OURS",
        partner_name: "乖宝",
        owner_name: "臭宝",
        chapter_labels: labels,
      });
      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    }

    revalidatePublishedArchive();
    return NextResponse.json({ ok: true, labels });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Save failed" },
      { status: 500 },
    );
  }
}
