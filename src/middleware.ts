import { NextResponse, type NextRequest } from "next/server";
import {
  PARTNER_COOKIE_NAME,
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

async function hasValidSiteSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(PARTNER_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  const verified = await verifyPartnerSessionToken(token);
  // Middleware checks HMAC, expiry, and token pwdVersion field only.
  // DB password_version is enforced in requireSiteSession() on API routes.
  return verified.ok;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/auth/login")) {
    const unlockUrl = request.nextUrl.clone();
    unlockUrl.pathname = "/unlock";
    unlockUrl.search = "";
    return NextResponse.redirect(unlockUrl);
  }

  if (pathname === "/unlock" || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const needsGate = isStudioRoute(pathname) || isExperiencePath(pathname);

  if (needsGate) {
    const sessionOk = await hasValidSiteSession(request);
    if (!sessionOk) {
      const unlockUrl = request.nextUrl.clone();
      unlockUrl.pathname = "/unlock";
      unlockUrl.search = "";
      return NextResponse.redirect(unlockUrl);
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
