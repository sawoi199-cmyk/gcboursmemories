import { NextResponse } from "next/server";
import { z } from "zod";
import { UpdateMomentSchema } from "@/features/moments/moment-schema";
import { deleteMoment, updateMoment } from "@/features/moments/moments";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MomentIdSchema = z.uuid();

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

  const id = MomentIdSchema.safeParse((await context.params).id);
  if (!id.success) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "找不到这条流光。" }, { status: 404 }),
    };
  }

  return { ok: true as const, ownerId: session.ownerId, id: id.data };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(context);
    if (!auth.ok) return auth.response;

    const parsed = UpdateMomentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "需要一句话（最多 140 字）、有效日期和有效排版。" },
        { status: 400 },
      );
    }

    const moment = await updateMoment(auth.ownerId, auth.id, parsed.data);
    if (!moment) {
      return NextResponse.json({ ok: false, message: "找不到这条流光。" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, moment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "更新流光失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await authorize(context);
    if (!auth.ok) return auth.response;

    const result = await deleteMoment(auth.ownerId, auth.id);
    if (!result.deleted) {
      return NextResponse.json({ ok: false, message: "找不到这条流光。" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, warnings: result.warnings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "删除流光失败" },
      { status: 500 },
    );
  }
}
