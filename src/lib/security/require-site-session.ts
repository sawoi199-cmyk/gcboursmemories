import { cookies } from "next/headers";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import {
  PARTNER_COOKIE_NAME,
  verifyPartnerSessionToken,
} from "@/lib/security/partner-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function assertSessionMatchesVersion(
  tokenPwdVersion: number,
  dbPasswordVersion: number | null | undefined,
): boolean {
  const currentVersion = dbPasswordVersion ?? 0;
  return tokenPwdVersion === currentVersion;
}

export async function requireSiteSession(): Promise<
  | { ok: true; ownerId: string; pwdVersion: number }
  | { ok: false; status: 401 | 503; message: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, message: "Supabase not configured" };
  }
  let ownerId: string;
  try {
    ownerId = getSiteOwnerId();
  } catch {
    return { ok: false, status: 503, message: "SITE_OWNER_ID not configured" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(PARTNER_COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const verified = await verifyPartnerSessionToken(token);
  if (!verified.ok) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("relationship_settings")
    .select("password_version")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 503, message: "Unable to verify session" };
  }

  const currentVersion = data?.password_version ?? 0;
  if (!assertSessionMatchesVersion(verified.pwdVersion, currentVersion)) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true, ownerId, pwdVersion: currentVersion };
}
