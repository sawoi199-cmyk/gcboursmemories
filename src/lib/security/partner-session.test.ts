import { afterEach, describe, expect, it } from "vitest";
import {
  createPartnerSessionToken,
  verifyPartnerSessionToken,
} from "@/lib/security/partner-session";

describe("partner-session", () => {
  const previous = process.env.SESSION_SIGNING_SECRET;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.SESSION_SIGNING_SECRET;
    } else {
      process.env.SESSION_SIGNING_SECRET = previous;
    }
  });

  it("signs and verifies a token with pwdVersion", async () => {
    process.env.SESSION_SIGNING_SECRET = "test-signing-secret-32chars!!";
    const token = await createPartnerSessionToken(3);
    const result = await verifyPartnerSessionToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pwdVersion).toBe(3);
    }
  });

  it("rejects tampered tokens", async () => {
    process.env.SESSION_SIGNING_SECRET = "test-signing-secret-32chars!!";
    const token = await createPartnerSessionToken(0);
    const tampered = `${token.slice(0, -4)}xxxx`;
    expect((await verifyPartnerSessionToken(tampered)).ok).toBe(false);
  });

  it("rejects expired tokens", async () => {
    process.env.SESSION_SIGNING_SECRET = "test-signing-secret-32chars!!";
    const token = await createPartnerSessionToken(0, Date.now() - 60_000, 1);
    expect((await verifyPartnerSessionToken(token)).ok).toBe(false);
  });

  it("rejects tokens signed with wrong secret", async () => {
    process.env.SESSION_SIGNING_SECRET = "test-signing-secret-32chars!!";
    const token = await createPartnerSessionToken(0);
    process.env.SESSION_SIGNING_SECRET = "different-signing-secret!!";
    expect((await verifyPartnerSessionToken(token)).ok).toBe(false);
  });
});
