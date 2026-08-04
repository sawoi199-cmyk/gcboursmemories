import { NextResponse } from "next/server";
import { fetchDriveFile } from "@/lib/google-drive/gas-client";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const url = new URL(request.url);
    const photoId = url.searchParams.get("photoId");
    if (!photoId) {
      return NextResponse.json({ ok: false, message: "photoId required" }, { status: 400 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const admin = createServiceClient();
    const { data: photo, error } = await admin
      .from("photos")
      .select("id, drive_file_id, mime_type, owner_id")
      .eq("id", photoId)
      .maybeSingle();

    if (error || !photo?.drive_file_id) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }

    if (photo.owner_id === session.ownerId) {
      // Site owner (studio) may access originals for any owned photo, including drafts.
    } else {
      const { data: links } = await admin
        .from("event_photos")
        .select("event_id")
        .eq("photo_id", photoId);

      const eventIds = (links ?? []).map((link) => link.event_id);
      if (eventIds.length === 0) {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
      }

      const { data: publishedEvents } = await admin
        .from("memory_events")
        .select("id")
        .in("id", eventIds)
        .eq("status", "published")
        .limit(1);

      if (!publishedEvents?.length) {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
      }
    }

    const file = await fetchDriveFile(photo.drive_file_id);
    if (!file.ok || !file.base64) {
      return NextResponse.json(
        { ok: false, message: file.message ?? "Drive fetch failed" },
        { status: 502 },
      );
    }

    const bytes = Buffer.from(file.base64, "base64");
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || photo.mime_type || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Proxy failed" },
      { status: 500 },
    );
  }
}
