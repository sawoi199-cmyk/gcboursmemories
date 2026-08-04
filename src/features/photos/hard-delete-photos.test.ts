import { describe, expect, it } from "vitest";
import { partitionUnreferencedPhotoIds } from "@/features/photos/hard-delete-photos";

describe("partitionUnreferencedPhotoIds", () => {
  it("returns only ids not in the referenced set", () => {
    expect(partitionUnreferencedPhotoIds(["a", "b", "c"], new Set(["b"]))).toEqual([
      "a",
      "c",
    ]);
  });

  it("returns empty when all still referenced", () => {
    expect(partitionUnreferencedPhotoIds(["a"], new Set(["a"]))).toEqual([]);
  });
});
