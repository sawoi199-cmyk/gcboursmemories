import { NextResponse, type NextRequest } from "next/server";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import {
  PARTNER_COOKIE_NAME,
  partnerCookieOptions,
  verifyPartnerSessionToken,
} from "@/lib/security/partner-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function isExperiencePath(pathname: string) {
  if (pathname === "/unlock") return false;
  const prefixes = ["/", "/story", "/timeline", "/letter", "/memory", "/today"];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isStudioRoute(pathname: string) {
  return pathname.startsWith("/studio");
}

function redirectToUnlock(request: NextRequest, clearCookie: boolean) {
  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.search = "";
  const response = NextResponse.redirect(unlockUrl);
  if (clearCookie) {
    response.cookies.set(PARTNER_COOKIE_NAME, "", {
      ...partnerCookieOptions(0),
      maxAge: 0,
    });
  }
  return response;
}

/**
 * HMAC + expiry + DB password_version gate.
 * Fail closed when SITE_OWNER_ID / Supabase / service role / DB query is unavailable.
 */
async function hasValidSiteSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(PARTNER_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  const verified = await verifyPartnerSessionToken(token);
  if (!verified.ok) {
    return false;
  }

  if (!isSupabaseConfigured()) {
    return false;
  }

  let ownerId: string;
  try {
    ownerId = getSiteOwnerId();
  } catch {
    return false;
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("relationship_settings")
      .select("password_version")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      return false;
    }

    const currentVersion = data?.password_version ?? 0;
    return verified.pwdVersion === currentVersion;
  } catch {
    // Missing service role key or Edge client failure → fail closed
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/auth/login")) {
    return redirectToUnlock(request, false);
  }

  if (pathname === "/unlock" || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const needsGate = isStudioRoute(pathname) || isExperiencePath(pathname);

  if (needsGate) {
    const sessionOk = await hasValidSiteSession(request);
    if (!sessionOk) {
      const hadCookie = Boolean(request.cookies.get(PARTNER_COOKIE_NAME)?.value);
      return redirectToUnlock(request, hadCookie);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/auth/login",
    "/auth/callback",
    "/",
    "/story",
    "/story/:path*",
    "/timeline",
    "/timeline/:path*",
    "/letter",
    "/letter/:path*",
    "/memory",
    "/memory/:path*",
    "/today",
    "/today/:path*",
    "/unlock",
  ],
};
