import { z } from "zod";
import { CHAPTER_IDS } from "@/config/chapters";
import { createServiceClient } from "@/lib/supabase/admin";

export const SaveMemorySchema = z.object({
  title: z.string().min(1).max(120),
  oneLine: z.string().max(200).nullable(),
  diaryBody: z.string().max(8000).nullable(),
  userNote: z.string().max(4000).nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  placeName: z.string().max(200).nullable(),
  templateId: z.string().min(1).max(80),
  chapter: z.enum(CHAPTER_IDS).nullable().optional(),
  photoOrder: z
    .array(
      z.object({
        photoId: z.string().uuid(),
        role: z.enum([
          "cover",
          "hero",
          "detail",
          "food",
          "place",
          "portrait",
          "candid",
        ]),
      }),
    )
    .max(100),
});

export type SaveMemoryInput = z.infer<typeof SaveMemorySchema>;

export async function saveMemoryEvent(input: {
  ownerId: string;
  memoryId: string;
  payload: SaveMemoryInput;
}) {
  const supabase = createServiceClient();
  const coverPhotoId = input.payload.photoOrder[0]?.photoId ?? null;

  const { error: updateError } = await supabase
    .from("memory_events")
    .update({
      title: input.payload.title,
      one_line: input.payload.oneLine,
      diary_body: input.payload.diaryBody,
      user_note: input.payload.userNote,
      event_date: input.payload.eventDate,
      place_name: input.payload.placeName,
      template_id: input.payload.templateId,
      ...(input.payload.chapter !== undefined ? { chapter: input.payload.chapter } : {}),
      cover_photo_id: coverPhotoId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Replace link ordering atomically enough for Phase 4 (delete + insert).
  const { error: deleteError } = await supabase
    .from("event_photos")
    .delete()
    .eq("event_id", input.memoryId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (input.payload.photoOrder.length > 0) {
    const rows = input.payload.photoOrder.map((item, index) => ({
      event_id: input.memoryId,
      photo_id: item.photoId,
      sort_order: index,
      role: index === 0 ? "cover" : item.role,
    }));

    const { error: insertError } = await supabase.from("event_photos").insert(rows);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return { ok: true as const, savedAt: new Date().toISOString() };
}
