import { describe, expect, it } from "vitest";
import {
  CreateWishSchema,
  UpdateWishSchema,
  toWishRowUpdate,
} from "@/features/wishes/wish-schema";

describe("CreateWishSchema", () => {
  it("trims the title and turns a blank note into null", () => {
    const result = CreateWishSchema.parse({ title: "  一起去看极光 ", note: "   ", author: "partner" });

    expect(result).toEqual({ title: "一起去看极光", note: null, author: "partner" });
  });

  it("rejects an empty title, an over-long title and an unknown author", () => {
    expect(CreateWishSchema.safeParse({ title: "  ", author: "owner" }).success).toBe(false);
    expect(CreateWishSchema.safeParse({ title: "愿".repeat(61), author: "owner" }).success).toBe(
      false,
    );
    expect(CreateWishSchema.safeParse({ title: "看海", author: "someone" }).success).toBe(false);
  });
});

describe("UpdateWishSchema", () => {
  it("requires doneOn when marking done", () => {
    expect(UpdateWishSchema.safeParse({ status: "done" }).success).toBe(false);
    expect(UpdateWishSchema.safeParse({ status: "done", doneOn: "2026-10-15" }).success).toBe(true);
  });

  it("rejects doneOn without status=done and malformed dates", () => {
    expect(UpdateWishSchema.safeParse({ doneOn: "2026-10-15" }).success).toBe(false);
    expect(UpdateWishSchema.safeParse({ status: "wish", doneOn: "2026-10-15" }).success).toBe(
      false,
    );
    expect(UpdateWishSchema.safeParse({ status: "done", doneOn: "2026/10/15" }).success).toBe(
      false,
    );
  });

  it("rejects an empty update", () => {
    expect(UpdateWishSchema.safeParse({}).success).toBe(false);
  });
});

describe("toWishRowUpdate", () => {
  it("sets done_on together with status=done", () => {
    const input = UpdateWishSchema.parse({ status: "done", doneOn: "2026-10-15" });

    expect(toWishRowUpdate(input)).toEqual({ status: "done", done_on: "2026-10-15" });
  });

  it("clears done_on when reverting to a wish", () => {
    const input = UpdateWishSchema.parse({ status: "wish" });

    expect(toWishRowUpdate(input)).toEqual({ status: "wish", done_on: null });
  });

  it("leaves status untouched for text edits", () => {
    const input = UpdateWishSchema.parse({ title: "去冰岛看极光", note: "" });

    expect(toWishRowUpdate(input)).toEqual({ title: "去冰岛看极光", note: null });
  });
});
