import { z } from "zod";
import { revalidatePublishedArchive } from "@/features/memories/published";
import {
  findUnreferencedPhotoIds,
  hardDeletePhotos,
} from "@/features/photos/hard-delete-photos";
import { createServiceClient } from "@/lib/supabase/admin";

export const RemovePhotosBodySchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1),
});

export function assertKeepsAtLeastOnePhoto(currentCount: number, removeCount: number) {
  if (currentCount - removeCount < 1) {
    throw new Error("至少保留一张照片；要删整条请用删除回忆。");
  }
}

export async function removePhotosFromEvent(input: {
  ownerId: string;
  memoryId: string;
  photoIds: string[];
}) {
  const supabase = createServiceClient();
  const removeSet = new Set(input.photoIds);

  const { data: event, error } = await supabase
    .from("memory_events")
    .select("id, cover_photo_id")
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) throw new Error("Not found");

  const { data: links, error: linksError } = await supabase
    .from("event_photos")
    .select("photo_id, role, sort_order")
    .eq("event_id", input.memoryId)
    .order("sort_order", { ascending: true });
  if (linksError) throw new Error(linksError.message);

  const current = links ?? [];
  for (const photoId of input.photoIds) {
    if (!current.some((row) => row.photo_id === photoId)) {
      throw new Error("One or more photos are not on this memory.");
    }
  }

  assertKeepsAtLeastOnePhoto(current.length, removeSet.size);

  const remaining = current.filter((row) => !removeSet.has(row.photo_id));
  const remainingPhotoIds = remaining.map((row) => row.photo_id);

  const { error: deleteLinksError } = await supabase
    .from("event_photos")
    .delete()
    .eq("event_id", input.memoryId)
    .in("photo_id", input.photoIds);
  if (deleteLinksError) throw new Error(deleteLinksError.message);

  const coverRemoved =
    event.cover_photo_id != null && removeSet.has(event.cover_photo_id);
  const nextCoverId = remainingPhotoIds[0] ?? null;

  if (coverRemoved) {
    const { error: coverError } = await supabase
      .from("memory_events")
      .update({ cover_photo_id: nextCoverId })
      .eq("id", input.memoryId)
      .eq("owner_id", input.ownerId);
    if (coverError) throw new Error(coverError.message);

    if (nextCoverId) {
      const { error: demoteError } = await supabase
        .from("event_photos")
        .update({ role: "detail" })
        .eq("event_id", input.memoryId)
        .eq("role", "cover");
      if (demoteError) throw new Error(demoteError.message);

      const { error: roleError } = await supabase
        .from("event_photos")
        .update({ role: "cover" })
        .eq("event_id", input.memoryId)
        .eq("photo_id", nextCoverId);
      if (roleError) throw new Error(roleError.message);
    }
  }

  const orphans = await findUnreferencedPhotoIds(input.photoIds);
  const cleanup = await hardDeletePhotos(input.ownerId, orphans);

  revalidatePublishedArchive();
  return {
    ok: true as const,
    remainingPhotoIds,
    warnings: cleanup.warnings,
  };
}
