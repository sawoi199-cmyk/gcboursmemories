import { NextResponse } from "next/server";
import { appendPhotoToMemory } from "@/features/memories/change-event-photos";
import { isDriveConfigured } from "@/lib/google-drive/gas-client";
import { parseUploadExifFromForm } from "@/lib/image/compress-for-upload";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }
    if (!isDriveConfigured()) {
      return NextResponse.json(
        { ok: false, message: "GAS Drive gateway is not configured." },
        { status: 503 },
      );
    }

    const { id } = await context.params;
    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Missing file field." }, { status: 400 });
    }

    const result = await appendPhotoToMemory({
      ownerId: session.ownerId,
      memoryId: id,
      file,
      clientExif: parseUploadExifFromForm(form),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Append failed";
    const status =
      message === "Not found" ? 404 : message.includes("最多 100") ? 400 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
