import { NextResponse } from "next/server";
import { z } from "zod";
import { UpdateWishSchema } from "@/features/wishes/wish-schema";
import { deleteWish, updateWish } from "@/features/wishes/wishes";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const WishIdSchema = z.uuid();

async function authorize(context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "Supabase 未配置" }, { status: 503 }),
    };
  }

  const session = await requireSiteSession();
  if (!session.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: session.message },
        { status: session.status },
      ),
    };
  }

  const id = WishIdSchema.safeParse((await context.params).id);
  if (!id.success) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "找不到这个愿望。" }, { status: 404 }),
    };
  }

  return { ok: true as const, ownerId: session.ownerId, id: id.data };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(context);
    if (!auth.ok) return auth.response;

    const parsed = UpdateWishSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "内容不合法，请检查后重试。" }, { status: 400 });
    }

    const wish = await updateWish(auth.ownerId, auth.id, parsed.data);
    if (!wish) {
      return NextResponse.json({ ok: false, message: "找不到这个愿望。" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, wish });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "更新愿望失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await authorize(context);
    if (!auth.ok) return auth.response;

    const deleted = await deleteWish(auth.ownerId, auth.id);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "找不到这个愿望。" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "删除愿望失败" },
      { status: 500 },
    );
  }
}
