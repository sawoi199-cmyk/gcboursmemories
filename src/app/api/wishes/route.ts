import { NextResponse } from "next/server";
import { CreateWishSchema } from "@/features/wishes/wish-schema";
import { createWish } from "@/features/wishes/wishes";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase 未配置" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const parsed = CreateWishSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "愿望不能为空，标题最多 60 字，备注最多 300 字。" },
        { status: 400 },
      );
    }

    const wish = await createWish(session.ownerId, parsed.data);
    return NextResponse.json({ ok: true, wish });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "保存愿望失败" },
      { status: 500 },
    );
  }
}
