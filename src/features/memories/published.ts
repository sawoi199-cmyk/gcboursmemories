import { appConfig } from "@/config/app";
import {
  CHAPTER_IDS,
  type ChapterId,
  resolveChapterLabels,
} from "@/config/chapters";
import { tryGetSiteOwnerId } from "@/lib/config/site-owner";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { EventPhoto, MemoryEvent, MemoryStatus } from "@/types/memory";

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

export type PublishedMemoryNav = {
  slug: string;
  title: string;
};

export type HomeStats = {
  daysTogether: number | null;
  memoryCount: number;
  placeCount: number;
  photoCount: number;
  relationshipStartDate: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  one_line: string | null;
  diary_body: string | null;
  event_date: string;
  place_name: string | null;
  template_id: string;
  status: MemoryStatus;
  mood: string | null;
  chapter: string | null;
  published_at: string | null;
};

type PhotoLinkRow = {
  event_id?: string;
  photo_id: string;
  role: string | null;
  sort_order: number | null;
  photos:
    | {
        id: string;
        original_filename: string;
        thumbnail_path: string | null;
        drive_file_id: string | null;
        width: number | null;
        height: number | null;
      }
    | {
        id: string;
        original_filename: string;
        thumbnail_path: string | null;
        drive_file_id: string | null;
        width: number | null;
        height: number | null;
      }[]
    | null;
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

async function signThumbnail(
  path: string | null,
  supabase: ReturnType<typeof createServiceClient>,
) {
  if (!path) return null;
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

/** Inclusive calendar days: meet day = 第 1 天. Uses local date parts to avoid UTC off-by-one. */
export function daysTogetherFromStartDate(
  startIsoDate: string,
  now: Date = new Date(),
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startIsoDate.trim());
  if (!match) return null;
  const start = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  if (diffDays < 0) return null;
  return diffDays + 1;
}

function mapPhotoFromLink(
  link: PhotoLinkRow,
  gradientIndex: number,
  thumbnailUrl: string | null,
): PublishedMemory["photos"][number] | null {
  const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
  if (!photo) return null;
  const width = photo.width ?? 1200;
  const height = photo.height ?? 1600;
  const orientation =
    width === height ? "square" : width > height ? "landscape" : "portrait";
  return {
    id: photo.id,
    photoId: photo.id,
    label: photo.original_filename,
    role: (link.role as EventPhoto["role"]) ?? "detail",
    orientation: orientation as EventPhoto["orientation"],
    gradient: gradientForIndex(gradientIndex),
    alt: photo.original_filename,
    thumbnailUrl,
    thumbnailPath: photo.thumbnail_path,
    driveFileId: photo.drive_file_id,
  };
}

function mapEventRow(event: EventRow, photos: PublishedMemory["photos"]): PublishedMemory {
  return {
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
  };
}

async function loadPhotosForEvent(
  supabase: ReturnType<typeof createServiceClient>,
  eventId: string,
  gradientBase: number,
): Promise<PublishedMemory["photos"]> {
  const { data: links } = await supabase
    .from("event_photos")
    .select(
      "photo_id, role, sort_order, photos(id, original_filename, thumbnail_path, drive_file_id, width, height)",
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const rows = (links ?? []) as PhotoLinkRow[];
  const signed = await Promise.all(
    rows.map(async (link, photoIndex) => {
      const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
      const thumbnailUrl = await signThumbnail(photo?.thumbnail_path ?? null, supabase);
      return mapPhotoFromLink(link, gradientBase + photoIndex, thumbnailUrl);
    }),
  );
  return signed.filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));
}

/** Pure helper for prev/next from a lightweight ordered list. */
export function neighborsFromOrderedList<T extends { slug: string }>(
  items: T[],
  slug: string,
): { index: number; prev: T | null; next: T | null } {
  const index = items.findIndex((item) => item.slug === slug);
  if (index === -1) {
    return { index: -1, prev: null, next: null };
  }
  return {
    index,
    prev: index > 0 ? (items[index - 1] ?? null) : null,
    next: index < items.length - 1 ? (items[index + 1] ?? null) : null,
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
    daysTogether = daysTogetherFromStartDate(start);
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

  const eventRows = events as EventRow[];
  const eventIds = eventRows.map((event) => event.id);

  const { data: allLinks, error: linksError } = await supabase
    .from("event_photos")
    .select(
      "event_id, photo_id, role, sort_order, photos(id, original_filename, thumbnail_path, drive_file_id, width, height)",
    )
    .in("event_id", eventIds)
    .order("sort_order", { ascending: true });

  if (linksError) throw new Error(linksError.message);

  const linksByEvent = new Map<string, PhotoLinkRow[]>();
  for (const link of (allLinks ?? []) as PhotoLinkRow[]) {
    if (!link.event_id) continue;
    const list = linksByEvent.get(link.event_id) ?? [];
    list.push(link);
    linksByEvent.set(link.event_id, list);
  }

  const pathsToSign = new Set<string>();
  for (const links of linksByEvent.values()) {
    for (const link of links) {
      const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
      if (photo?.thumbnail_path) pathsToSign.add(photo.thumbnail_path);
    }
  }

  const signedEntries = await Promise.all(
    [...pathsToSign].map(async (path) => [path, await signThumbnail(path, supabase)] as const),
  );
  const signedByPath = new Map(signedEntries);

  return eventRows.map((event, index) => {
    const links = linksByEvent.get(event.id) ?? [];
    const photos = links
      .map((link, photoIndex) => {
        const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
        const thumbnailUrl = photo?.thumbnail_path
          ? (signedByPath.get(photo.thumbnail_path) ?? null)
          : null;
        return mapPhotoFromLink(link, index + photoIndex, thumbnailUrl);
      })
      .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));
    return mapEventRow(event, photos);
  });
}

export async function getPublishedMemoryBySlug(slug: string): Promise<{
  memory: PublishedMemory;
  prev: PublishedMemoryNav | null;
  next: PublishedMemoryNav | null;
} | null> {
  if (!isSupabaseConfigured()) return null;

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return null;
  const supabase = createServiceClient();

  const { data: event, error } = await supabase
    .from("memory_events")
    .select(
      "id, slug, title, subtitle, one_line, diary_body, event_date, place_name, template_id, status, mood, chapter, published_at",
    )
    .eq("owner_id", ownerId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) return null;

  const eventRow = event as EventRow;
  const photos = await loadPhotosForEvent(supabase, eventRow.id, 0);
  const memory = mapEventRow(eventRow, photos);

  // Lightweight neighbor list: no photos / no signed URLs.
  const { data: navRows } = await supabase
    .from("memory_events")
    .select("slug, title, event_date, published_at")
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .order("published_at", { ascending: true });

  const { prev, next } = neighborsFromOrderedList(navRows ?? [], slug);

  return {
    memory,
    prev: prev ? { slug: prev.slug, title: prev.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
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
