import { NextResponse } from "next/server";
import { mockLetter } from "@/config/mock-data";
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
    const letter = await getReplyableLetter(admin, id, session.ownerId);
    if (!letter) return NextResponse.json({ ok: false, message: "这封信无法回复。" }, { status: 404 });

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

async function getReplyableLetter(
  admin: ReturnType<typeof createServiceClient>,
  id: string,
  ownerId: string,
): Promise<{ id: string } | null> {
  if (id !== mockLetter.id) {
    const { data, error } = await admin
      .from("letters")
      .select("id")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data: published, error: publishedError } = await admin
    .from("letters")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("letter_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (publishedError) throw new Error(publishedError.message);
  if (published) return published;

  const { data: created, error: createError } = await admin
    .from("letters")
    .insert({
      owner_id: ownerId,
      title: mockLetter.title,
      body: mockLetter.body,
      letter_date: mockLetter.letterDate,
      status: "published",
    })
    .select("id")
    .single();
  if (createError) throw new Error(createError.message);
  return created;
}
