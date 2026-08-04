import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/utils/slug";

export const PublishMemorySchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Slug 只能包含字母、数字和连字符"),
});

export type PublishMemoryInput = z.infer<typeof PublishMemorySchema>;

export function normalizePublishSlug(input: string) {
  return slugifyTitle(input).toLowerCase();
}

export async function publishMemoryEvent(input: {
  ownerId: string;
  memoryId: string;
  slug: string;
}) {
  const supabase = createServiceClient();
  const slug = normalizePublishSlug(input.slug);

  const { data: event, error } = await supabase
    .from("memory_events")
    .select("id, title, event_date, status")
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) throw new Error("Memory not found.");
  if (!event.title?.trim()) throw new Error("发布前需要标题。");
  if (!event.event_date) throw new Error("发布前需要日期。");

  const { count, error: countError } = await supabase
    .from("event_photos")
    .select("photo_id", { count: "exact", head: true })
    .eq("event_id", input.memoryId);

  if (countError) throw new Error(countError.message);
  if (!count || count < 1) throw new Error("发布前至少需要一张照片。");

  const { data: conflict } = await supabase
    .from("memory_events")
    .select("id")
    .eq("slug", slug)
    .neq("id", input.memoryId)
    .maybeSingle();

  if (conflict) {
    const suggestion = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
    throw new Error(`Slug 已被占用，可尝试：${suggestion}`);
  }

  const { error: updateError } = await supabase
    .from("memory_events")
    .update({
      slug,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);

  if (updateError) throw new Error(updateError.message);

  return { ok: true as const, slug, status: "published" as const };
}

export async function unpublishMemoryEvent(input: { ownerId: string; memoryId: string }) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("memory_events")
    .update({
      status: "draft",
      published_at: null,
    })
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);

  if (error) throw new Error(error.message);
  return { ok: true as const, status: "draft" as const };
}
