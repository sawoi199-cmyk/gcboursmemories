import { appConfig } from "@/config/app";
import {
  resolveChapterLabels,
  type ChapterId,
} from "@/config/chapters";
import { createServiceClient } from "@/lib/supabase/admin";
import type { EventPhoto, MemoryEvent, PhotoRole } from "@/types/memory";

export type EditorPhoto = EventPhoto & {
  photoId: string;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  takenAt: string | null;
};

export type EditorMemoryPayload = {
  memory: MemoryEvent & {
    userNote: string;
    eventDate: string;
    placeName: string | null;
    status: MemoryEvent["status"];
  };
  photos: EditorPhoto[];
  siblingDrafts: Array<{ id: string; title: string; eventDate: string }>;
  diaryVersions: Array<{
    id: string;
    title: string;
    one_line: string | null;
    source: string;
    created_at: string;
  }>;
  /** Resolved display labels (defaults + relationship_settings.chapter_labels). */
  chapterLabels: Record<ChapterId, string>;
};

function gradientForIndex(index: number) {
  const presets = [
    "linear-gradient(145deg,#1b1d22,#b46a6a55,#f6f1ea)",
    "linear-gradient(160deg,#201c1a,#c6a15b66,#e8ded4)",
    "linear-gradient(135deg,#111216,#7a706a,#fffdf9)",
    "linear-gradient(150deg,#3d4a5c,#e8ded4,#c6a15b)",
  ];
  return presets[index % presets.length];
}

export async function getEditorMemory(
  ownerId: string,
  memoryId: string,
): Promise<EditorMemoryPayload | null> {
  const supabase = createServiceClient();

  const { data: event, error } = await supabase
    .from("memory_events")
    .select(
      "id, slug, title, subtitle, one_line, diary_body, event_date, place_name, template_id, status, user_note, mood, chapter",
    )
    .eq("id", memoryId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !event) {
    return null;
  }

  const { data: links, error: linksError } = await supabase
    .from("event_photos")
    .select("photo_id, sort_order, role, photos(id, thumbnail_path, original_filename, taken_at, width, height)")
    .eq("event_id", memoryId)
    .order("sort_order", { ascending: true });

  if (linksError) {
    throw new Error(linksError.message);
  }

  const photos: EditorPhoto[] = [];

  for (const [index, link] of (links ?? []).entries()) {
    const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
    if (!photo) continue;

    let thumbnailUrl: string | null = null;
    if (photo.thumbnail_path) {
      const { data: signed } = await supabase.storage
        .from("memory-thumbnails")
        .createSignedUrl(photo.thumbnail_path, appConfig.signedUrlTtlSeconds);
      thumbnailUrl = signed?.signedUrl ?? null;
    }

    const orientation =
      photo.width && photo.height
        ? photo.height > photo.width
          ? "portrait"
          : photo.width === photo.height
            ? "square"
            : "landscape"
        : "landscape";

    photos.push({
      id: photo.id,
      photoId: photo.id,
      label: photo.original_filename,
      role: (link.role as PhotoRole) ?? "detail",
      orientation,
      gradient: gradientForIndex(index),
      alt: photo.original_filename,
      thumbnailPath: photo.thumbnail_path,
      thumbnailUrl,
      takenAt: photo.taken_at,
    });
  }

  const { data: siblings } = await supabase
    .from("memory_events")
    .select("id, title, event_date")
    .eq("owner_id", ownerId)
    .eq("status", "draft")
    .neq("id", memoryId)
    .order("event_date", { ascending: false })
    .limit(20);

  const { data: diaryVersions } = await supabase
    .from("diary_versions")
    .select("id, title, one_line, source, created_at")
    .eq("event_id", memoryId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: settings } = await supabase
    .from("relationship_settings")
    .select("chapter_labels")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const chapterLabels = resolveChapterLabels(
    (settings?.chapter_labels as Partial<Record<ChapterId, string>> | null) ?? null,
  );

  return {
    memory: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      subtitle: event.subtitle,
      oneLine: event.one_line ?? "",
      diaryBody: event.diary_body ?? "",
      eventDate: event.event_date,
      placeName: event.place_name,
      templateId: event.template_id,
      status: event.status,
      mood: event.mood ?? undefined,
      chapter: event.chapter ?? undefined,
      userNote: event.user_note ?? "",
    },
    photos,
    siblingDrafts: (siblings ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      eventDate: item.event_date,
    })),
    diaryVersions: diaryVersions ?? [],
    chapterLabels,
  };
}
