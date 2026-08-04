import { describe, expect, it } from "vitest";
import { PublishMemorySchema, normalizePublishSlug } from "@/features/memories/publish-memory";
import { createPartnerSessionToken, verifyPartnerSessionToken } from "@/lib/security/partner-session";
import { UnlockPayloadSchema } from "@/lib/security/unlock-schema";
import { buildPublishSlug, slugifyTitle } from "@/lib/utils/slug";

describe("Phase 8 integration-ish security + publish helpers", () => {
  it("unlock payload rejects empty codes", () => {
    expect(UnlockPayloadSchema.safeParse({ code: "" }).success).toBe(false);
    expect(UnlockPayloadSchema.safeParse({ code: "0415" }).success).toBe(true);
  });

  it("publish slug pipeline stays ASCII-only", () => {
    const slug = normalizePublishSlug(buildPublishSlug("2026-08-04", "福州之行"));
    expect(PublishMemorySchema.safeParse({ slug }).success).toBe(true);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(slugifyTitle("草稿")).toBe("memory");
  });

  it("partner session round-trips with signing secret", async () => {
    process.env.SESSION_SIGNING_SECRET = "phase8-test-secret-value!!";
    const token = await createPartnerSessionToken(0);
    const verified = await verifyPartnerSessionToken(token);
    expect(verified.ok).toBe(true);
  });
});
