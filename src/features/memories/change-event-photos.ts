import { appConfig } from "@/config/app";
import { uploadPhotoForOwner } from "@/features/uploads/upload-photo";
import { revalidatePublishedArchive } from "@/features/memories/published";
import {
  findUnreferencedPhotoIds,
  hardDeletePhotos,
} from "@/features/photos/hard-delete-photos";
import type { UploadExifMeta } from "@/lib/image/compress-for-upload";
import { createServiceClient } from "@/lib/supabase/admin";
import type { PhotoOrientation, PhotoRole } from "@/types/memory";

export const MAX_EVENT_PHOTOS = 100;

const PHOTO_ROLES = new Set<PhotoRole>([
  "cover",
  "hero",
  "detail",
  "food",
  "place",
  "portrait",
  "candid",
]);

export type EventPhotoSlot = {
  photoId: string;
  sortOrder: number;
  role: string;
};

export type AppendSlotPlan = {
  sortOrder: number;
  role: "cover" | "detail";
  setCover: boolean;
};

export type ReplaceSlotPlan = {
  sortOrder: number;
  role: string;
  nextCoverPhotoId: string | null;
  coverChanged: boolean;
};

export type MemoryPhotoChange = {
  photoId: string;
  label: string;
  alt: string;
  role: PhotoRole;
  orientation: PhotoOrientation;
  gradient: string;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  takenAt: string | null;
};

const GRADIENTS = [
  "linear-gradient(145deg,#1b1d22,#b46a6a55,#f6f1ea)",
  "linear-gradient(160deg,#201c1a,#c6a15b66,#e8ded4)",
  "linear-gradient(135deg,#111216,#7a706a,#fffdf9)",
  "linear-gradient(150deg,#3d4a5c,#e8ded4,#c6a15b)",
];

export function nextAppendSlot(currentCount: number): AppendSlotPlan {
  if (currentCount >= MAX_EVENT_PHOTOS) {
    throw new Error("一条回忆最多 100 张照片。");
  }
  if (currentCount <= 0) {
    return { sortOrder: 0, role: "cover", setCover: true };
  }
  return { sortOrder: currentCount, role: "detail", setCover: false };
}

export function planReplacePhoto(input: {
  slots: EventPhotoSlot[];
  oldPhotoId: string;
  newPhotoId: string;
  coverPhotoId: string | null;
}): ReplaceSlotPlan {
  const slot = input.slots.find((item) => item.photoId === input.oldPhotoId);
  if (!slot) {
    throw new Error("One or more photos are not on this memory.");
  }
  const nextCoverPhotoId =
    input.coverPhotoId === input.oldPhotoId ? input.newPhotoId : input.coverPhotoId;
  return {
    sortOrder: slot.sortOrder,
    role: slot.role,
    nextCoverPhotoId,
    coverChanged: nextCoverPhotoId !== input.coverPhotoId,
  };
}

function asRole(role: string): PhotoRole {
  return PHOTO_ROLES.has(role as PhotoRole) ? (role as PhotoRole) : "detail";
}

function orientationOf(width: number | null, height: number | null): PhotoOrientation {
  if (!width || !height) return "landscape";
  if (height > width) return "portrait";
  if (width === height) return "square";
  return "landscape";
}

function gradientForIndex(index: number) {
  return GRADIENTS[index % GRADIENTS.length] ?? GRADIENTS[0];
}

async function signThumbnail(
  supabase: ReturnType<typeof createServiceClient>,
  path: string | null,
) {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("memory-thumbnails")
    .createSignedUrls([path], appConfig.signedUrlTtlSeconds);
  return data?.[0]?.signedUrl ?? null;
}

async function loadOwnedEvent(
  supabase: ReturnType<typeof createServiceClient>,
  ownerId: string,
  memoryId: string,
) {
  const { data: event, error } = await supabase
    .from("memory_events")
    .select("id, cover_photo_id")
    .eq("id", memoryId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) throw new Error("Not found");
  return event;
}

async function loadSlots(
  supabase: ReturnType<typeof createServiceClient>,
  memoryId: string,
): Promise<EventPhotoSlot[]> {
  const { data, error } = await supabase
    .from("event_photos")
    .select("photo_id, sort_order, role")
    .eq("event_id", memoryId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    photoId: row.photo_id,
    sortOrder: row.sort_order,
    role: row.role,
  }));
}

function toChange(input: {
  photoId: string;
  label: string;
  role: string;
  width: number | null;
  height: number | null;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  takenAt: string | null;
  index: number;
}): MemoryPhotoChange {
  return {
    photoId: input.photoId,
    label: input.label,
    alt: input.label,
    role: asRole(input.role),
    orientation: orientationOf(input.width, input.height),
    gradient: gradientForIndex(input.index),
    thumbnailPath: input.thumbnailPath,
    thumbnailUrl: input.thumbnailUrl,
    takenAt: input.takenAt,
  };
}

export async function replacePhotoOnMemory(input: {
  ownerId: string;
  memoryId: string;
  photoId: string;
  file: File;
  clientExif?: UploadExifMeta | null;
}) {
  const supabase = createServiceClient();
  const event = await loadOwnedEvent(supabase, input.ownerId, input.memoryId);
  const slots = await loadSlots(supabase, input.memoryId);
  const index = slots.findIndex((item) => item.photoId === input.photoId);
  if (index < 0) {
    throw new Error("One or more photos are not on this memory.");
  }

  const uploaded = await uploadPhotoForOwner({
    ownerId: input.ownerId,
    file: input.file,
    clientExif: input.clientExif,
  });

  const plan = planReplacePhoto({
    slots,
    oldPhotoId: input.photoId,
    newPhotoId: uploaded.id,
    coverPhotoId: event.cover_photo_id,
  });

  let coverUpdated = false;
  try {
    const { error: insertError } = await supabase.from("event_photos").insert({
      event_id: input.memoryId,
      photo_id: uploaded.id,
      sort_order: plan.sortOrder,
      role: plan.role,
    });
    if (insertError) throw new Error(insertError.message);

    if (plan.coverChanged) {
      const { error: coverError } = await supabase
        .from("memory_events")
        .update({ cover_photo_id: plan.nextCoverPhotoId })
        .eq("id", input.memoryId)
        .eq("owner_id", input.ownerId);
      if (coverError) throw new Error(coverError.message);
      coverUpdated = true;
    }

    const { error: deleteError } = await supabase
      .from("event_photos")
      .delete()
      .eq("event_id", input.memoryId)
      .eq("photo_id", input.photoId);
    if (deleteError) throw new Error(deleteError.message);
  } catch (error) {
    if (coverUpdated) {
      await supabase
        .from("memory_events")
        .update({ cover_photo_id: input.photoId })
        .eq("id", input.memoryId)
        .eq("owner_id", input.ownerId);
    }
    try {
      await hardDeletePhotos(input.ownerId, [uploaded.id]);
    } catch {
      // The caller still sees the original failure.
    }
    throw error;
  }

  const orphans = await findUnreferencedPhotoIds([input.photoId]);
  const cleanup = await hardDeletePhotos(input.ownerId, orphans);
  revalidatePublishedArchive();

  const thumbnailUrl = await signThumbnail(supabase, uploaded.thumbnailPath);
  return {
    ok: true as const,
    replacedPhotoId: input.photoId,
    warnings: cleanup.warnings,
    photo: toChange({
      photoId: uploaded.id,
      label: uploaded.originalFilename,
      role: plan.role,
      width: uploaded.width,
      height: uploaded.height,
      thumbnailPath: uploaded.thumbnailPath,
      thumbnailUrl,
      takenAt: uploaded.takenAt,
      index,
    }),
  };
}

export async function appendPhotoToMemory(input: {
  ownerId: string;
  memoryId: string;
  file: File;
  clientExif?: UploadExifMeta | null;
}) {
  const supabase = createServiceClient();
  await loadOwnedEvent(supabase, input.ownerId, input.memoryId);
  const slots = await loadSlots(supabase, input.memoryId);
  const plan = nextAppendSlot(slots.length);

  const uploaded = await uploadPhotoForOwner({
    ownerId: input.ownerId,
    file: input.file,
    clientExif: input.clientExif,
  });

  try {
    const { error: insertError } = await supabase.from("event_photos").insert({
      event_id: input.memoryId,
      photo_id: uploaded.id,
      sort_order: plan.sortOrder,
      role: plan.role,
    });
    if (insertError) throw new Error(insertError.message);

    if (plan.setCover) {
      const { error: coverError } = await supabase
        .from("memory_events")
        .update({ cover_photo_id: uploaded.id })
        .eq("id", input.memoryId)
        .eq("owner_id", input.ownerId);
      if (coverError) throw new Error(coverError.message);
    }
  } catch (error) {
    try {
      await hardDeletePhotos(input.ownerId, [uploaded.id]);
    } catch {
      // The caller still sees the original failure.
    }
    throw error;
  }

  revalidatePublishedArchive();
  const thumbnailUrl = await signThumbnail(supabase, uploaded.thumbnailPath);
  return {
    ok: true as const,
    warnings: [] as string[],
    photo: toChange({
      photoId: uploaded.id,
      label: uploaded.originalFilename,
      role: plan.role,
      width: uploaded.width,
      height: uploaded.height,
      thumbnailPath: uploaded.thumbnailPath,
      thumbnailUrl,
      takenAt: uploaded.takenAt,
      index: plan.sortOrder,
    }),
  };
}
