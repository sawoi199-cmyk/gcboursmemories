import {
  findUnreferencedPhotoIds,
  hardDeletePhotos,
} from "@/features/photos/hard-delete-photos";
import { createServiceClient } from "@/lib/supabase/admin";

export async function deleteOrphanPhoto(input: {
  ownerId: string;
  photoId: string;
}) {
  const supabase = createServiceClient();

  const { data: photo, error } = await supabase
    .from("photos")
    .select("id")
    .eq("id", input.photoId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!photo) throw new Error("Not found");

  const stillLinked = await findUnreferencedPhotoIds([input.photoId]);
  if (stillLinked.length === 0) {
    throw new Error("Photo is still linked to an event");
  }

  const cleanup = await hardDeletePhotos(input.ownerId, [input.photoId]);
  return { ok: true as const, warnings: cleanup.warnings };
}
