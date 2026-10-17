import { describe, expect, it } from "vitest";
import { CreateCommentSchema, SetLikeSchema } from "@/features/moments/moment-schema";
import { getSocialSummaries, orderAuthors } from "@/features/moments/moment-social";
import type { createServiceClient } from "@/lib/supabase/admin";

type ServiceClient = ReturnType<typeof createServiceClient>;

function fakeClient(tables: Record<string, unknown[]>): ServiceClient {
  const from = (table: string) => {
    const result = { data: tables[table] ?? [], error: null };
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) builder[method] = () => builder;
    builder.in = async () => result;
    return builder;
  };
  return { from } as unknown as ServiceClient;
}

describe("comment and like schemas", () => {
  it("trims a comment and enforces 1–300 characters", () => {
    expect(CreateCommentSchema.parse({ author: "owner", body: "  好看 " })).toEqual({
      author: "owner",
      body: "好看",
    });
    expect(CreateCommentSchema.safeParse({ author: "owner", body: "   " }).success).toBe(false);
    expect(CreateCommentSchema.safeParse({ author: "owner", body: "字".repeat(301) }).success).toBe(
      false,
    );
  });

  it("requires a known author and a boolean like flag", () => {
    expect(SetLikeSchema.safeParse({ author: "partner", liked: true }).success).toBe(true);
    expect(SetLikeSchema.safeParse({ author: "someone", liked: true }).success).toBe(false);
    expect(SetLikeSchema.safeParse({ author: "partner", liked: "yes" }).success).toBe(false);
  });
});

describe("orderAuthors", () => {
  it("dedupes and lists partner before owner", () => {
    expect(orderAuthors(["owner", "partner", "owner"])).toEqual(["partner", "owner"]);
  });
});

describe("getSocialSummaries", () => {
  it("counts comments and collects likes per moment, defaulting to empty", async () => {
    const client = fakeClient({
      moment_comments: [{ moment_id: "a" }, { moment_id: "a" }, { moment_id: "b" }],
      moment_likes: [
        { moment_id: "a", author: "owner" },
        { moment_id: "a", author: "partner" },
      ],
    });

    const summaries = await getSocialSummaries(client, "owner-1", ["a", "b", "c"]);

    expect(summaries.get("a")).toEqual({ commentCount: 2, likedBy: ["partner", "owner"] });
    expect(summaries.get("b")).toEqual({ commentCount: 1, likedBy: [] });
    expect(summaries.get("c")).toEqual({ commentCount: 0, likedBy: [] });
  });
});
