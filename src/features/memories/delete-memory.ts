import { z } from "zod";
import { revalidatePublishedArchive } from "@/features/memories/published";
import {
  findUnreferencedPhotoIds,
  hardDeletePhotos,
} from "@/features/photos/hard-delete-photos";
import { createServiceClient } from "@/lib/supabase/admin";

export const DeleteMemoryBodySchema = z.object({
  confirmTitle: z.string().optional(),
});

export function assertPublishedDeleteConfirm(
  title: string,
  confirmTitle: string | undefined,
  status: "draft" | "published" | "archived",
) {
  if (status !== "published") return;
  if (confirmTitle !== title) {
    throw new Error(
      "confirmTitle must exactly match the memory title to delete a published memory.",
    );
  }
}

export async function deleteMemoryEvent(input: {
  ownerId: string;
  memoryId: string;
  confirmTitle?: string;
}) {
  const supabase = createServiceClient();
  const { data: event, error } = await supabase
    .from("memory_events")
    .select("id, title, status")
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) throw new Error("Not found");

  assertPublishedDeleteConfirm(event.title, input.confirmTitle, event.status);

  const { data: links, error: linksError } = await supabase
    .from("event_photos")
    .select("photo_id")
    .eq("event_id", input.memoryId);
  if (linksError) throw new Error(linksError.message);
  const photoIds = (links ?? []).map((row) => row.photo_id);

  const { error: deleteError } = await supabase
    .from("memory_events")
    .delete()
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);
  if (deleteError) throw new Error(deleteError.message);

  const orphans = await findUnreferencedPhotoIds(photoIds);
  const cleanup = await hardDeletePhotos(input.ownerId, orphans);

  revalidatePublishedArchive();
  return { ok: true as const, warnings: cleanup.warnings };
}
