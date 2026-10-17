import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatInvalidPayload } from "@/lib/validation/invalid-payload";

const Schema = z.object({
  title: z.string().min(1).max(5),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memoryId: z.string().uuid(),
  photoOrder: z.array(z.object({ role: z.enum(["cover", "detail"]) })),
  liked: z.boolean(),
});

const labels = {
  title: "标题",
  eventDate: "日期",
  memoryId: "回忆 ID",
  photoOrder: "照片",
  "photoOrder.role": "照片角色",
  liked: "点赞状态",
};

function messageFor(input: unknown, max?: number) {
  const result = Schema.safeParse(input);
  if (result.success) throw new Error("expected failure");
  const message = formatInvalidPayload(result.error, labels);
  return max === undefined ? message : message.slice(0, max);
}

const valid = {
  title: "海边",
  eventDate: "2026-10-01",
  memoryId: "00000000-0000-4000-8000-000000000001",
  photoOrder: [{ role: "cover" }],
  liked: true,
};

describe("formatInvalidPayload", () => {
  it("names an empty title", () => {
    expect(messageFor({ ...valid, title: "" })).toBe("提交的内容不合格：标题不能为空");
  });

  it("reports length limits", () => {
    expect(messageFor({ ...valid, title: "这是一个很长的标题" })).toBe(
      "提交的内容不合格：标题最多 5 个字",
    );
  });

  it("reports format, uuid, enum and missing fields", () => {
    expect(messageFor({ ...valid, eventDate: "1/10" })).toContain("日期格式不对");
    expect(messageFor({ ...valid, memoryId: "abc" })).toContain("回忆 ID不是有效的 ID");
    expect(messageFor({ ...valid, photoOrder: [{ role: "cover" }, { role: "x" }] })).toContain(
      "照片角色第 2 项不是可选的值",
    );
    expect(messageFor({ ...valid, liked: undefined })).toContain("缺少点赞状态");
  });

  it("lists at most three problems", () => {
    const message = messageFor({});
    expect(message).toMatch(/；等 5 处$/);
  });
});
