import { describe, expect, it } from "vitest";
import { LetterReplySchema } from "@/features/letters/reply-schema";

describe("LetterReplySchema", () => {
  it("trims and accepts a reply", () => {
    const result = LetterReplySchema.parse({ body: "  我也想你。  " });

    expect(result.body).toBe("我也想你。");
  });

  it("rejects an empty reply", () => {
    expect(LetterReplySchema.safeParse({ body: "   " }).success).toBe(false);
  });
});
