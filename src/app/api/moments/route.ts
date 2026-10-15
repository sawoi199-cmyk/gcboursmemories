import { NextResponse } from "next/server";
import {
  CreateMomentFieldsSchema,
  MomentCursorQuerySchema,
  momentFieldsFromForm,
} from "@/features/moments/moment-schema";
import { MomentRequestError, createMoment, listMoments } from "@/features/moments/moments";
import { isDriveConfigured } from "@/lib/google-drive/gas-client";
import { parseUploadExifFromForm } from "@/lib/image/compress-for-upload";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase 未配置" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const url = new URL(request.url);
    const parsed = MomentCursorQuerySchema.safeParse({
      cursorDate: url.searchParams.get("cursorDate") ?? undefined,
      cursorSeq: url.searchParams.get("cursorSeq") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid query" }, { status: 400 });
    }

    const { cursorDate, cursorSeq } = parsed.data;
    const cursor =
      cursorDate !== undefined && cursorSeq !== undefined
        ? { takenOn: cursorDate, seq: cursorSeq }
        : null;
    const page = await listMoments(session.ownerId, cursor);
    return NextResponse.json({ ok: true, ...page });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "加载流光失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase 未配置" }, { status: 503 });
    }
    if (!isDriveConfigured()) {
      return NextResponse.json({ ok: false, message: "Drive 网关未配置" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "请选择一张照片。" }, { status: 400 });
    }

    const fields = CreateMomentFieldsSchema.safeParse(momentFieldsFromForm(form));
    if (!fields.success) {
      return NextResponse.json(
        { ok: false, message: "需要一句话（最多 140 字）和一个日期。" },
        { status: 400 },
      );
    }

    const result = await createMoment({
      ownerId: session.ownerId,
      file,
      clientExif: parseUploadExifFromForm(form),
      fields: fields.data,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof MomentRequestError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "发布流光失败" },
      { status: 500 },
    );
  }
}
