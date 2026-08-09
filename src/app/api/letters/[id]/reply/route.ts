import { NextResponse } from "next/server";
import { LetterReplySchema } from "@/features/letters/reply-schema";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase 未配置" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const parsed = LetterReplySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "回信不能为空，且不能超过 3000 字。" },
        { status: 400 },
      );
    }

    const { id } = await params;
    const admin = createServiceClient();
    const { data: letter, error: letterError } = await admin
      .from("letters")
      .select("id")
      .eq("id", id)
      .eq("owner_id", session.ownerId)
      .eq("status", "published")
      .maybeSingle();

    if (letterError) throw new Error(letterError.message);
    if (!letter) {
      return NextResponse.json({ ok: false, message: "这封信无法回复。" }, { status: 404 });
    }

    const { data: reply, error: replyError } = await admin
      .from("letter_replies")
      .upsert(
        {
          owner_id: session.ownerId,
          letter_id: letter.id,
          body: parsed.data.body,
        },
        { onConflict: "letter_id" },
      )
      .select("body")
      .single();

    if (replyError) throw new Error(replyError.message);

    return NextResponse.json({ ok: true, body: reply.body });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "保存回信失败" },
      { status: 500 },
    );
  }
}
