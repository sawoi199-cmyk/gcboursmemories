import { NextResponse } from "next/server";
import { getDriveConnectionStatus } from "@/lib/google-drive/gas-client";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (isSupabaseConfigured()) {
    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }
  }

  const status = await getDriveConnectionStatus();
  return NextResponse.json({ ok: true, status });
}
