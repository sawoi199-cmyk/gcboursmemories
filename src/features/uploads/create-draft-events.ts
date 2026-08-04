import { randomUUID } from "node:crypto";
import {
  groupPhotos,
  type PhotoGroupCandidate,
} from "@/features/event-grouping/group-photos";
import { buildDraftSlug } from "@/lib/utils/slug";
import { createServiceClient } from "@/lib/supabase/admin";

export async function createDraftEventsFromPhotos(input: {
  ownerId: string;
  photoIds: string[];
}) {
  const supabase = createServiceClient();
  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, taken_at, latitude, longitude")
    .eq("owner_id", input.ownerId)
    .in("id", input.photoIds);

  if (error) {
    throw new Error(error.message);
  }
  if (!photos?.length) {
    throw new Error("No photos found for grouping.");
  }

  const candidates = groupPhotos(
    photos.map((photo) => ({
      id: photo.id,
      takenAt: photo.taken_at ? new Date(photo.taken_at) : null,
      latitude: photo.latitude,
      longitude: photo.longitude,
    })),
  );

  const created = [];

  for (const candidate of candidates) {
    const event = await insertDraftEvent(supabase, input.ownerId, candidate);
    created.push(event);
  }

  return created;
}

async function insertDraftEvent(
  supabase: ReturnType<typeof createServiceClient>,
  ownerId: string,
  candidate: PhotoGroupCandidate,
) {
  const eventId = randomUUID();
  const title = `草稿 · ${candidate.eventDate}`;
  const slug = buildDraftSlug(candidate.eventDate, title);
  const coverPhotoId = candidate.photoIds[0] ?? null;

  const { error: eventError } = await supabase.from("memory_events").insert({
    id: eventId,
    owner_id: ownerId,
    slug,
    title,
    one_line: null,
    diary_body: null,
    event_date: candidate.eventDate,
    event_start_time: candidate.startAt,
    event_end_time: candidate.endAt,
    place_name: null,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    template_id: "editorial-hero",
    cover_photo_id: coverPhotoId,
    status: "draft",
    ai_confidence: candidate.confidence,
  });

  if (eventError) {
    throw new Error(eventError.message);
  }

  const links = candidate.photoIds.map((photoId, index) => ({
    event_id: eventId,
    photo_id: photoId,
    sort_order: index,
    role: index === 0 ? "cover" : "detail",
  }));

  const { error: linkError } = await supabase.from("event_photos").insert(links);
  if (linkError) {
    throw new Error(linkError.message);
  }

  return {
    id: eventId,
    slug,
    title,
    eventDate: candidate.eventDate,
    photoIds: candidate.photoIds,
    confidence: candidate.confidence,
  };
}
