import { NextResponse } from "next/server";
import { uploadPhotoForOwner } from "@/features/uploads/upload-photo";
import { isDriveConfigured } from "@/lib/google-drive/gas-client";
import { parseUploadExifFromForm } from "@/lib/image/compress-for-upload";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, message: "Supabase is not configured." },
        { status: 503 },
      );
    }
    if (!isDriveConfigured()) {
      return NextResponse.json(
        { ok: false, message: "GAS Drive gateway is not configured." },
        { status: 503 },
      );
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Missing file field." },
        { status: 400 },
      );
    }

    const photo = await uploadPhotoForOwner({
      ownerId: session.ownerId,
      file,
      clientExif: parseUploadExifFromForm(form),
    });
    return NextResponse.json({ ok: true, photo });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 500 },
    );
  }
}
