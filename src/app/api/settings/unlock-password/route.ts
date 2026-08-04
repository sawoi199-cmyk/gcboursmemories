import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/security/password-hash";
import {
  PARTNER_COOKIE_NAME,
  partnerCookieOptions,
} from "@/lib/security/partner-session";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const DEFAULT_OWNER_NAME = "臭宝";
const DEFAULT_PARTNER_NAME = "乖宝";

const BodySchema = z.object({
  password: z.string().min(4).max(64),
  confirmPassword: z.string().min(4).max(64),
});

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const json: unknown = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "密码至少 4 位。" }, { status: 400 });
    }
    if (parsed.data.password !== parsed.data.confirmPassword) {
      return NextResponse.json({ ok: false, message: "两次输入不一致。" }, { status: 400 });
    }

    const accessHash = await hashPassword(parsed.data.password);
    const admin = createServiceClient();

    const { data: existing } = await admin
      .from("relationship_settings")
      .select("id, password_version")
      .eq("owner_id", session.ownerId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("relationship_settings")
        .update({
          access_hash: accessHash,
          password_version: (existing.password_version ?? 0) + 1,
        })
        .eq("id", existing.id)
        .eq("owner_id", session.ownerId);
      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    } else {
      const { error } = await admin.from("relationship_settings").insert({
        owner_id: session.ownerId,
        relationship_title: "OURS",
        partner_name: DEFAULT_PARTNER_NAME,
        owner_name: DEFAULT_OWNER_NAME,
        access_hash: accessHash,
        password_version: 0,
      });
      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    }

    const response = NextResponse.json({
      ok: true,
      passwordSet: true,
      mustReunlock: true,
    });
    response.cookies.set(PARTNER_COOKIE_NAME, "", {
      ...partnerCookieOptions(0),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Save failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const admin = createServiceClient();
    const { data } = await admin
      .from("relationship_settings")
      .select("access_hash, partner_name, unlock_title, unlock_hint")
      .eq("owner_id", session.ownerId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      passwordSet: Boolean(data?.access_hash),
      partnerName: data?.partner_name ?? null,
      unlockTitle: data?.unlock_title ?? null,
      unlockHint: data?.unlock_hint ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Load failed" },
      { status: 500 },
    );
  }
}
