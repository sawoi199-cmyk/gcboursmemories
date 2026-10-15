import { describe, expect, it } from "vitest";
import {
  CreateMomentFieldsSchema,
  MomentCursorQuerySchema,
  UpdateMomentSchema,
  momentCursorOrFilter,
  momentFieldsFromForm,
} from "@/features/moments/moment-schema";

const WISH_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("CreateMomentFieldsSchema", () => {
  it("accepts one sentence, a date, an author and an optional wish", () => {
    const result = CreateMomentFieldsSchema.parse({
      caption: "  终于看到极光了 ",
      takenOn: "2026-12-20",
      author: "owner",
      wishId: WISH_ID,
    });

    expect(result).toEqual({
      caption: "终于看到极光了",
      takenOn: "2026-12-20",
      author: "owner",
      wishId: WISH_ID,
    });
  });

  it("rejects a blank or over-long caption and impossible dates", () => {
    const base = { takenOn: "2026-12-20", author: "partner" };
    expect(CreateMomentFieldsSchema.safeParse({ ...base, caption: "  " }).success).toBe(false);
    expect(
      CreateMomentFieldsSchema.safeParse({ ...base, caption: "光".repeat(141) }).success,
    ).toBe(false);
    expect(
      CreateMomentFieldsSchema.safeParse({ ...base, caption: "日出", takenOn: "2026-02-30" })
        .success,
    ).toBe(false);
  });
});

describe("momentFieldsFromForm", () => {
  it("reads text fields and drops empty ones", () => {
    const form = new FormData();
    form.append("caption", "海边");
    form.append("takenOn", "2026-10-15");
    form.append("author", "partner");
    form.append("wishId", "");

    expect(momentFieldsFromForm(form)).toEqual({
      caption: "海边",
      takenOn: "2026-10-15",
      author: "partner",
      wishId: undefined,
    });
  });
});

describe("UpdateMomentSchema", () => {
  it("requires at least one field", () => {
    expect(UpdateMomentSchema.safeParse({}).success).toBe(false);
    expect(UpdateMomentSchema.safeParse({ caption: "改一句" }).success).toBe(true);
  });
});

describe("moment cursor", () => {
  it("requires cursorDate and cursorSeq together", () => {
    expect(MomentCursorQuerySchema.safeParse({ cursorDate: "2026-10-15" }).success).toBe(false);
    expect(
      MomentCursorQuerySchema.parse({ cursorDate: "2026-10-15", cursorSeq: "42" }),
    ).toEqual({ cursorDate: "2026-10-15", cursorSeq: 42 });
  });

  it("builds the keyset filter for older moments", () => {
    expect(momentCursorOrFilter({ takenOn: "2026-10-15", seq: 42 })).toBe(
      "taken_on.lt.2026-10-15,and(taken_on.eq.2026-10-15,seq.lt.42)",
    );
  });
});
