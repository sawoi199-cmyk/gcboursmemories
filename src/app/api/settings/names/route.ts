import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const NamesBodySchema = z.object({
  ownerName: z.string().trim().min(1).max(20),
  partnerName: z.string().trim().min(1).max(20),
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
    const parsed = NamesBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "称呼不能为空，且不超过 20 字。" }, { status: 400 });
    }

    const admin = createServiceClient();
    const { data: existing } = await admin
      .from("relationship_settings")
      .select("id")
      .eq("owner_id", session.ownerId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("relationship_settings")
        .update({
          owner_name: parsed.data.ownerName,
          partner_name: parsed.data.partnerName,
        })
        .eq("id", existing.id)
        .eq("owner_id", session.ownerId);
      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    } else {
      const { error } = await admin.from("relationship_settings").insert({
        owner_id: session.ownerId,
        relationship_title: "OURS",
        owner_name: parsed.data.ownerName,
        partner_name: parsed.data.partnerName,
        default_diary_tone: "warm",
        default_language: "zh-CN",
      });
      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      ownerName: parsed.data.ownerName,
      partnerName: parsed.data.partnerName,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Save failed" },
      { status: 500 },
    );
  }
}
