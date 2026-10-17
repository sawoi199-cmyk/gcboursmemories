import { describe, expect, it } from "vitest";
import { SaveMemorySchema } from "@/features/memories/save-memory";

describe("SaveMemorySchema", () => {
  it("accepts a valid editor payload", () => {
    const result = SaveMemorySchema.safeParse({
      title: "江边的晚风",
      oneLine: "晚风很轻",
      diaryBody: "正文",
      userNote: "备注",
      eventDate: "2025-05-20",
      placeName: "江边",
      templateId: "editorial-hero",
      photoOrder: [
        {
          photoId: "00000000-0000-4000-8000-000000000001",
          role: "cover",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a blank title so autosave works while AI writes one", () => {
    const result = SaveMemorySchema.safeParse({
      title: "   ",
      oneLine: null,
      diaryBody: null,
      userNote: null,
      eventDate: "2025-05-20",
      placeName: null,
      templateId: "editorial-hero",
      photoOrder: [],
    });
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("");
  });

  it("rejects invalid dates", () => {
    const result = SaveMemorySchema.safeParse({
      title: "x",
      oneLine: null,
      diaryBody: null,
      userNote: null,
      eventDate: "20-05-2025",
      placeName: null,
      templateId: "editorial-hero",
      photoOrder: [],
    });
    expect(result.success).toBe(false);
  });
});
