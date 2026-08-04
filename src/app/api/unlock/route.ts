import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import { hashPassword, verifyPassword } from "@/lib/security/password-hash";
import {
  PARTNER_COOKIE_NAME,
  createPartnerSessionToken,
  partnerCookieOptions,
} from "@/lib/security/partner-session";
import { UnlockPayloadSchema } from "@/lib/security/unlock-schema";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const DEFAULT_OWNER_NAME = "臭宝";
const DEFAULT_PARTNER_NAME = "乖宝";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 12;

function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimited(key: string) {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || row.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  row.count += 1;
  return row.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  try {
    if (rateLimited(clientKey(request))) {
      return NextResponse.json(
        { ok: false, message: "尝试过多，请稍后再试。" },
        { status: 429 },
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, message: "服务未配置完成。" },
        { status: 503 },
      );
    }

    let ownerId: string;
    try {
      ownerId = getSiteOwnerId();
    } catch {
      return NextResponse.json(
        { ok: false, message: "服务未配置完成。" },
        { status: 503 },
      );
    }

    const json: unknown = await request.json();
    const parsed = UnlockPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "请输入专属密码。" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: settings, error } = await supabase
      .from("relationship_settings")
      .select("access_hash, password_version, owner_name, partner_name")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: "暂时无法验证。" }, { status: 500 });
    }

    let passwordVersion: number;
    let ownerName: string;
    let partnerName: string;

    if (!settings?.access_hash) {
      const bootstrap = process.env.SITE_BOOTSTRAP_PASSWORD;
      if (!bootstrap || !timingSafeEqualString(parsed.data.code, bootstrap)) {
        return NextResponse.json(
          { ok: false, message: "密码不正确。" },
          { status: 401 },
        );
      }

      const accessHash = await hashPassword(parsed.data.code);
      ownerName = settings?.owner_name ?? DEFAULT_OWNER_NAME;
      partnerName = settings?.partner_name ?? DEFAULT_PARTNER_NAME;
      passwordVersion = 0;

      const { error: upsertError } = await supabase.from("relationship_settings").upsert(
        {
          owner_id: ownerId,
          relationship_title: "OURS",
          owner_name: ownerName,
          partner_name: partnerName,
          access_hash: accessHash,
          password_version: passwordVersion,
        },
        { onConflict: "owner_id" },
      );

      if (upsertError) {
        return NextResponse.json({ ok: false, message: "暂时无法验证。" }, { status: 500 });
      }
    } else {
      const valid = await verifyPassword(parsed.data.code, settings.access_hash);
      if (!valid) {
        return NextResponse.json({ ok: false, message: "密码不正确。" }, { status: 401 });
      }
      passwordVersion = settings.password_version ?? 0;
      ownerName = settings.owner_name ?? DEFAULT_OWNER_NAME;
      partnerName = settings.partner_name ?? DEFAULT_PARTNER_NAME;
    }

    const token = await createPartnerSessionToken(passwordVersion);
    const response = NextResponse.json({
      ok: true,
      ownerName,
      partnerName,
    });
    response.cookies.set(PARTNER_COOKIE_NAME, token, partnerCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && error.message.includes("SESSION_SIGNING_SECRET")
            ? "服务端会话密钥未配置（SESSION_SIGNING_SECRET）。"
            : "解锁失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
