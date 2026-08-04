import { afterEach, describe, expect, it } from "vitest";
import { getSiteOwnerId, tryGetSiteOwnerId } from "@/lib/config/site-owner";

describe("getSiteOwnerId", () => {
  const previous = process.env.SITE_OWNER_ID;
  afterEach(() => {
    if (previous === undefined) delete process.env.SITE_OWNER_ID;
    else process.env.SITE_OWNER_ID = previous;
  });

  it("returns SITE_OWNER_ID", () => {
    process.env.SITE_OWNER_ID = "00000000-0000-4000-8000-000000000099";
    expect(getSiteOwnerId()).toBe("00000000-0000-4000-8000-000000000099");
  });

  it("throws when missing", () => {
    delete process.env.SITE_OWNER_ID;
    expect(() => getSiteOwnerId()).toThrow(/SITE_OWNER_ID/);
  });
});

describe("tryGetSiteOwnerId", () => {
  const previous = process.env.SITE_OWNER_ID;
  afterEach(() => {
    if (previous === undefined) delete process.env.SITE_OWNER_ID;
    else process.env.SITE_OWNER_ID = previous;
  });

  it("returns null when missing or invalid", () => {
    delete process.env.SITE_OWNER_ID;
    expect(tryGetSiteOwnerId()).toBeNull();
    process.env.SITE_OWNER_ID = "not-a-uuid";
    expect(tryGetSiteOwnerId()).toBeNull();
  });

  it("returns SITE_OWNER_ID when valid", () => {
    process.env.SITE_OWNER_ID = "00000000-0000-4000-8000-000000000099";
    expect(tryGetSiteOwnerId()).toBe("00000000-0000-4000-8000-000000000099");
  });
});
