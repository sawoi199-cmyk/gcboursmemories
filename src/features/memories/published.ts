import { appConfig } from "@/config/app";
import {
  CHAPTER_IDS,
  type ChapterId,
  resolveChapterLabels,
} from "@/config/chapters";
import { tryGetSiteOwnerId } from "@/lib/config/site-owner";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { EventPhoto, MemoryEvent } from "@/types/memory";

export type PublishedMemory = MemoryEvent & {
  publishedAt: string | null;
  photos: Array<
    EventPhoto & {
      photoId: string;
      driveFileId: string | null;
      thumbnailPath: string | null;
    }
  >;
};

export type HomeStats = {
  daysTogether: number | null;
  memoryCount: number;
  placeCount: number;
  photoCount: number;
  relationshipStartDate: string | null;
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

async function signThumbnail(path: string | null) {
  if (!path || !isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase.storage
    .from("memory-thumbnails")
    .createSignedUrl(path, appConfig.signedUrlTtlSeconds);
  return data?.signedUrl ?? null;
}

function emptyHomeStats(): HomeStats {
  return {
    daysTogether: null,
    memoryCount: 0,
    placeCount: 0,
    photoCount: 0,
    relationshipStartDate: null,
  };
}

export async function getHomeStats(): Promise<HomeStats> {
  if (!isSupabaseConfigured()) {
    return emptyHomeStats();
  }

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) {
    return emptyHomeStats();
  }
  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("relationship_settings")
    .select("relationship_start_date")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const { data: events } = await supabase
    .from("memory_events")
    .select("id, place_name")
    .eq("owner_id", ownerId)
    .eq("status", "published");

  const ids = (events ?? []).map((event) => event.id);
  let photoCount = 0;
  if (ids.length > 0) {
    const { count } = await supabase
      .from("event_photos")
      .select("photo_id", { count: "exact", head: true })
      .in("event_id", ids);
    photoCount = count ?? 0;
  }

  const places = new Set(
    (events ?? [])
      .map((event) => event.place_name?.trim())
      .filter((place): place is string => Boolean(place)),
  );

  let daysTogether: number | null = null;
  const start = settings?.relationship_start_date;
  if (start) {
    const startMs = Date.parse(`${start}T00:00:00Z`);
    if (!Number.isNaN(startMs)) {
      daysTogether = Math.max(0, Math.floor((Date.now() - startMs) / 86_400_000));
    }
  }

  return {
    daysTogether,
    memoryCount: events?.length ?? 0,
    placeCount: places.size,
    photoCount,
    relationshipStartDate: start ?? null,
  };
}

export async function getPublishedMemories(): Promise<PublishedMemory[]> {
  if (!isSupabaseConfigured()) return [];

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return [];
  const supabase = createServiceClient();
  const { data: events, error } = await supabase
    .from("memory_events")
    .select(
      "id, slug, title, subtitle, one_line, diary_body, event_date, place_name, template_id, status, mood, chapter, published_at",
    )
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .order("published_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!events?.length) return [];

  const result: PublishedMemory[] = [];
  for (const [index, event] of events.entries()) {
    const { data: links } = await supabase
      .from("event_photos")
      .select(
        "photo_id, role, sort_order, photos(id, original_filename, thumbnail_path, drive_file_id, width, height)",
      )
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true });

    const photos = [];
    for (const [photoIndex, link] of (links ?? []).entries()) {
      const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
      if (!photo) continue;
      const thumbnailUrl = await signThumbnail(photo.thumbnail_path);
      const width = photo.width ?? 1200;
      const height = photo.height ?? 1600;
      const orientation =
        width === height ? "square" : width > height ? "landscape" : "portrait";
      photos.push({
        id: photo.id,
        photoId: photo.id,
        label: photo.original_filename,
        role: (link.role as EventPhoto["role"]) ?? "detail",
        orientation: orientation as EventPhoto["orientation"],
        gradient: gradientForIndex(index + photoIndex),
        alt: photo.original_filename,
        thumbnailUrl,
        thumbnailPath: photo.thumbnail_path,
        driveFileId: photo.drive_file_id,
      });
    }

    result.push({
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
      tags: undefined,
      chapter: event.chapter ?? undefined,
      publishedAt: event.published_at,
      photos,
    });
  }

  return result;
}

export async function getPublishedMemoryBySlug(slug: string) {
  const all = await getPublishedMemories();
  const index = all.findIndex((item) => item.slug === slug);
  if (index === -1) return null;
  return {
    memory: all[index],
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  };
}

export type StoryChapter = {
  id: string;
  title: string;
  count: number;
  oneLine: string;
  dateRange: string;
  coverUrl: string | null;
  coverGradient: string;
};

export async function getStoryChapters(): Promise<StoryChapter[]> {
  const memories = await getPublishedMemories();
  let customLabels: Partial<Record<ChapterId, string>> | null = null;
  if (isSupabaseConfigured()) {
    const ownerId = tryGetSiteOwnerId();
    if (ownerId) {
      const supabase = createServiceClient();
      const { data: settings } = await supabase
        .from("relationship_settings")
        .select("chapter_labels")
        .eq("owner_id", ownerId)
        .maybeSingle();
      customLabels =
        (settings?.chapter_labels as Partial<Record<ChapterId, string>> | null) ?? null;
    }
  }
  const labels = resolveChapterLabels(customLabels);
  const order = [...CHAPTER_IDS];
  const groups = new Map<string, PublishedMemory[]>();

  for (const memory of memories) {
    const key =
      memory.chapter && isChapterKey(memory.chapter, labels)
        ? memory.chapter
        : "ordinary_days";
    const list = groups.get(key) ?? [];
    list.push(memory);
    groups.set(key, list);
  }

  return order
    .filter((key) => (groups.get(key)?.length ?? 0) > 0)
    .map((key, index) => {
      const list = groups.get(key) ?? [];
      const dates = list.map((item) => item.eventDate).sort();
      const cover = list[0]?.photos[0];
      return {
        id: key,
        title: labels[key as ChapterId] ?? key,
        count: list.length,
        oneLine: list[0]?.oneLine || list[0]?.title || "",
        dateRange:
          dates.length === 0
            ? ""
            : dates[0] === dates[dates.length - 1]
              ? dates[0]
              : `${dates[0]} — ${dates[dates.length - 1]}`,
        coverUrl: cover?.thumbnailUrl ?? null,
        coverGradient: cover?.gradient ?? gradientForIndex(index),
      };
    });
}

function isChapterKey(value: string, labels: Record<string, string>) {
  return value in labels;
}
