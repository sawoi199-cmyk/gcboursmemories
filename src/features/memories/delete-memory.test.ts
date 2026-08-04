import { describe, expect, it } from "vitest";
import {
  DeleteMemoryBodySchema,
  assertPublishedDeleteConfirm,
} from "@/features/memories/delete-memory";

describe("DeleteMemoryBodySchema", () => {
  it("allows empty body", () => {
    expect(DeleteMemoryBodySchema.safeParse({}).success).toBe(true);
  });

  it("accepts confirmTitle", () => {
    expect(DeleteMemoryBodySchema.safeParse({ confirmTitle: "福州之行" }).success).toBe(true);
  });
});

describe("assertPublishedDeleteConfirm", () => {
  it("allows draft without title", () => {
    expect(() => assertPublishedDeleteConfirm("t", undefined, "draft")).not.toThrow();
  });

  it("rejects published without matching title", () => {
    expect(() => assertPublishedDeleteConfirm("福州之行", undefined, "published")).toThrow(
      /confirmTitle/,
    );
    expect(() => assertPublishedDeleteConfirm("福州之行", "错", "published")).toThrow(
      /confirmTitle/,
    );
  });

  it("allows published with exact title", () => {
    expect(() =>
      assertPublishedDeleteConfirm("福州之行", "福州之行", "published"),
    ).not.toThrow();
  });
});
