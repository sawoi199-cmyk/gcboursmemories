import { deleteDriveFile } from "@/lib/google-drive/gas-client";
import { createServiceClient } from "@/lib/supabase/admin";

export function partitionUnreferencedPhotoIds(
  candidateIds: string[],
  referencedIds: Set<string>,
): string[] {
  return candidateIds.filter((id) => !referencedIds.has(id));
}

export async function findUnreferencedPhotoIds(photoIds: string[]): Promise<string[]> {
  if (photoIds.length === 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("event_photos")
    .select("photo_id")
    .in("photo_id", photoIds);
  if (error) throw new Error(error.message);
  const referenced = new Set((data ?? []).map((row) => row.photo_id));
  return partitionUnreferencedPhotoIds(photoIds, referenced);
}

export async function hardDeletePhotos(
  ownerId: string,
  photoIds: string[],
): Promise<{ deleted: string[]; warnings: string[] }> {
  const unique = [...new Set(photoIds)];
  if (unique.length === 0) return { deleted: [], warnings: [] };

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("photos")
    .select("id, drive_file_id, thumbnail_path")
    .eq("owner_id", ownerId)
    .in("id", unique);
  if (error) throw new Error(error.message);

  const deleted: string[] = [];
  const warnings: string[] = [];

  for (const row of rows ?? []) {
    try {
      await deleteDriveFile(row.drive_file_id);
    } catch (err) {
      warnings.push(
        `Drive ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (row.thumbnail_path) {
      const { error: storageError } = await supabase.storage
        .from("memory-thumbnails")
        .remove([row.thumbnail_path]);
      if (storageError) {
        warnings.push(`Thumbnail ${row.id}: ${storageError.message}`);
      }
    }
    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("id", row.id)
      .eq("owner_id", ownerId);
    if (deleteError) {
      warnings.push(`DB ${row.id}: ${deleteError.message}`);
      continue;
    }
    deleted.push(row.id);
  }

  return { deleted, warnings };
}
