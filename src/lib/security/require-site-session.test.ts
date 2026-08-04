import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSessionMatchesVersion,
  invalidatePasswordVersionCache,
  requireSiteSession,
} from "@/lib/security/require-site-session";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/config/site-owner", () => ({
  getSiteOwnerId: vi.fn(),
}));

vi.mock("@/lib/security/partner-session", () => ({
  PARTNER_COOKIE_NAME: "ours_partner_session",
  verifyPartnerSessionToken: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: vi.fn(),
}));

import { cookies } from "next/headers";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import { verifyPartnerSessionToken } from "@/lib/security/partner-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const OWNER_ID = "00000000-0000-4000-8000-000000000099";

describe("assertSessionMatchesVersion", () => {
  it("matches when token version equals db version", () => {
    expect(assertSessionMatchesVersion(2, 2)).toBe(true);
  });

  it("treats missing db version as 0", () => {
    expect(assertSessionMatchesVersion(0, null)).toBe(true);
    expect(assertSessionMatchesVersion(0, undefined)).toBe(true);
    expect(assertSessionMatchesVersion(1, null)).toBe(false);
  });

  it("rejects version mismatch", () => {
    expect(assertSessionMatchesVersion(1, 2)).toBe(false);
  });
});

describe("requireSiteSession", () => {
  const mockCookies = vi.mocked(cookies);
  const mockGetSiteOwnerId = vi.mocked(getSiteOwnerId);
  const mockVerify = vi.mocked(verifyPartnerSessionToken);
  const mockCreateServiceClient = vi.mocked(createServiceClient);
  const mockIsSupabaseConfigured = vi.mocked(isSupabaseConfigured);

  beforeEach(() => {
    vi.clearAllMocks();
    invalidatePasswordVersionCache();
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockGetSiteOwnerId.mockReturnValue(OWNER_ID);
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "session-token" }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    mockVerify.mockResolvedValue({ ok: true, exp: 9999999999, pwdVersion: 2 });
    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { password_version: 2 },
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 503 when Supabase is not configured", async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);
    const result = await requireSiteSession();
    expect(result).toEqual({
      ok: false,
      status: 503,
      message: "Supabase not configured",
    });
  });

  it("returns 503 when SITE_OWNER_ID is missing", async () => {
    mockGetSiteOwnerId.mockImplementation(() => {
      throw new Error("SITE_OWNER_ID is missing or not a valid UUID.");
    });
    const result = await requireSiteSession();
    expect(result).toEqual({
      ok: false,
      status: 503,
      message: "SITE_OWNER_ID not configured",
    });
  });

  it("returns 401 when session cookie is missing", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    const result = await requireSiteSession();
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 when token verification fails", async () => {
    mockVerify.mockResolvedValue({ ok: false, reason: "signature" });
    const result = await requireSiteSession();
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 when password version mismatches", async () => {
    mockVerify.mockResolvedValue({ ok: true, exp: 9999999999, pwdVersion: 1 });
    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { password_version: 2 },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);
    const result = await requireSiteSession();
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 503 when settings select returns an error", async () => {
    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "connection failed" },
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);
    const result = await requireSiteSession();
    expect(result).toEqual({
      ok: false,
      status: 503,
      message: "Unable to verify session",
    });
  });

  it("returns ownerId and pwdVersion on success", async () => {
    const result = await requireSiteSession();
    expect(result).toEqual({ ok: true, ownerId: OWNER_ID, pwdVersion: 2 });
  });
});
