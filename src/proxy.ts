import { NextResponse, type NextRequest } from "next/server";
import {
  PARTNER_COOKIE_NAME,
  partnerCookieOptions,
  verifyPartnerSessionToken,
} from "@/lib/security/partner-session";

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
 * Fast gate: HMAC + expiry only (no Supabase round-trip).
 * password_version is enforced on APIs via requireSiteSession().
 */
async function hasValidSiteSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(PARTNER_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  const verified = await verifyPartnerSessionToken(token);
  return verified.ok;
}

export async function proxy(request: NextRequest) {
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
