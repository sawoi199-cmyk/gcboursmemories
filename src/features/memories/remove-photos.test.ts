import { describe, expect, it } from "vitest";
import {
  RemovePhotosBodySchema,
  assertKeepsAtLeastOnePhoto,
} from "@/features/memories/remove-photos";

describe("RemovePhotosBodySchema", () => {
  it("requires at least one uuid", () => {
    expect(RemovePhotosBodySchema.safeParse({ photoIds: [] }).success).toBe(false);
    expect(
      RemovePhotosBodySchema.safeParse({
        photoIds: ["00000000-0000-4000-8000-000000000001"],
      }).success,
    ).toBe(true);
  });
});

describe("assertKeepsAtLeastOnePhoto", () => {
  it("throws when removal would leave zero", () => {
    expect(() => assertKeepsAtLeastOnePhoto(1, 1)).toThrow(/至少保留一张/);
  });

  it("allows leaving one or more", () => {
    expect(() => assertKeepsAtLeastOnePhoto(3, 2)).not.toThrow();
  });
});
