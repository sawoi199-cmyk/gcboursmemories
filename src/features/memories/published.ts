import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
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

/** Shared tag for timeline / story / home / detail published reads. */
export const PUBLISHED_CACHE_TAG = "published-archive";

/** Short server cache; signed URLs remain valid (TTL 1h). */
const PUBLISHED_CACHE_REVALIDATE_SECONDS = 60;

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

type ServiceClient = ReturnType<typeof createServiceClient>;

function gradientForIndex(index: number) {
  const presets = [
    "linear-gradient(145deg,#1b1d22,#b46a6a55,#f6f1ea)",
    "linear-gradient(160deg,#201c1a,#c6a15b66,#e8ded4)",
    "linear-gradient(135deg,#111216,#7a706a,#fffdf9)",
    "linear-gradient(150deg,#3d4a5c,#e8ded4,#c6a15b)",
  ];
  return presets[index % presets.length];
}

/** Prefer explicit cover role; otherwise first by sort_order. */
export function pickCoverLink(links: PhotoLinkRow[]): PhotoLinkRow | null {
  if (links.length === 0) return null;
  const cover = links.find((link) => link.role === "cover");
  return cover ?? links[0] ?? null;
}

async function signThumbnailsBatch(
  supabase: ServiceClient,
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const signedByPath = new Map<string, string>();
  if (unique.length === 0) return signedByPath;

  const { data } = await supabase.storage
    .from("memory-thumbnails")
    .createSignedUrls(unique, appConfig.signedUrlTtlSeconds);

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      signedByPath.set(item.path, item.signedUrl);
    }
  }
  return signedByPath;
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

function groupLinksByEvent(links: PhotoLinkRow[]) {
  const linksByEvent = new Map<string, PhotoLinkRow[]>();
  for (const link of links) {
    if (!link.event_id) continue;
    const list = linksByEvent.get(link.event_id) ?? [];
    list.push(link);
    linksByEvent.set(link.event_id, list);
  }
  return linksByEvent;
}

async function loadPhotosForEvent(
  supabase: ServiceClient,
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
  const paths = rows
    .map((link) => {
      const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
      return photo?.thumbnail_path ?? null;
    })
    .filter((path): path is string => Boolean(path));

  const signedByPath = await signThumbnailsBatch(supabase, paths);

  return rows
    .map((link, photoIndex) => {
      const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
      const thumbnailUrl = photo?.thumbnail_path
        ? (signedByPath.get(photo.thumbnail_path) ?? null)
        : null;
      return mapPhotoFromLink(link, gradientBase + photoIndex, thumbnailUrl);
    })
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));
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

/** Invalidate Studio list pages so drafts/published counts match the DB. */
export function revalidateStudioMemoryLists() {
  revalidatePath("/studio");
  revalidatePath("/studio/drafts");
}

/** Invalidate timeline / story / home / detail published caches immediately. */
export function revalidatePublishedArchive() {
  revalidateTag(PUBLISHED_CACHE_TAG, { expire: 0 });
  // Publish/save also changes what Studio lists should show.
  revalidateStudioMemoryLists();
}

async function fetchHomeStatsForOwner(ownerId: string): Promise<HomeStats> {
  const supabase = createServiceClient();
  let { data: settings } = await supabase
    .from("relationship_settings")
    .select("owner_id, relationship_start_date")
    .eq("owner_id", ownerId)
    .maybeSingle();

  // Single-archive fallback: if SITE_OWNER_ID does not match the seeded row, still show stats.
  if (!settings) {
    const { data: fallback } = await supabase
      .from("relationship_settings")
      .select("owner_id, relationship_start_date")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    settings = fallback;
  }

  const statsOwnerId = settings?.owner_id ?? ownerId;

  const { data: events } = await supabase
    .from("memory_events")
    .select("id, place_name")
    .eq("owner_id", statsOwnerId)
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

export async function getHomeStats(): Promise<HomeStats> {
  if (!isSupabaseConfigured()) {
    return emptyHomeStats();
  }

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) {
    return emptyHomeStats();
  }

  return unstable_cache(
    () => fetchHomeStatsForOwner(ownerId),
    ["home-stats", ownerId],
    {
      revalidate: PUBLISHED_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLISHED_CACHE_TAG],
    },
  )();
}

/** Newest-first page size for timeline “加载更多”. */
export const TIMELINE_PAGE_SIZE = 20;

/** Oldest-first page size for chapter reading. */
export const CHAPTER_PAGE_SIZE = 20;

export type TimelineCursor = {
  eventDate: string;
  id: string;
};

export type TimelineFilters = {
  chapter?: ChapterId;
  hasPlace?: boolean;
  /** YYYY-MM-DD — Instagram-style day filter */
  eventDate?: string;
};

export type TimelinePageResult = {
  memories: PublishedMemory[];
  nextCursor: TimelineCursor | null;
};

export type ChapterMeta = {
  title: string;
  count: number;
  dateRange: string;
};

export type ChapterPageResult = TimelinePageResult;

export type CalendarDayCount = {
  date: string;
  count: number;
};

/** PostgREST filter: newer pages when ordered by event_date desc, id desc. */
export function timelineCursorOrFilter(cursor: TimelineCursor): string {
  return `event_date.lt.${cursor.eventDate},and(event_date.eq.${cursor.eventDate},id.lt.${cursor.id})`;
}

/** PostgREST filter: later pages when ordered by event_date asc, id asc. */
export function chapterCursorOrFilter(cursor: TimelineCursor): string {
  return `event_date.gt.${cursor.eventDate},and(event_date.eq.${cursor.eventDate},id.gt.${cursor.id})`;
}

/**
 * Match story list grouping: null / unknown chapter ids → ordinary_days.
 * Valid chapter ids other than ordinary_days are exact matches.
 */
function applyStoryChapterFilter<
  Q extends {
    eq: (column: string, value: string) => Q;
    or: (filters: string) => Q;
  },
>(query: Q, chapterId: ChapterId): Q {
  if (chapterId !== "ordinary_days") {
    return query.eq("chapter", chapterId);
  }
  return query.or(
    `chapter.eq.ordinary_days,chapter.is.null,chapter.not.in.(${CHAPTER_IDS.join(",")})`,
  );
}

async function hydrateEventsWithCovers(
  supabase: ServiceClient,
  eventRows: EventRow[],
): Promise<PublishedMemory[]> {
  if (eventRows.length === 0) return [];

  const eventIds = eventRows.map((event) => event.id);
  const { data: allLinks, error: linksError } = await supabase
    .from("event_photos")
    .select(
      "event_id, photo_id, role, sort_order, photos(id, original_filename, thumbnail_path, drive_file_id, width, height)",
    )
    .in("event_id", eventIds)
    .order("sort_order", { ascending: true });

  if (linksError) throw new Error(linksError.message);

  const linksByEvent = groupLinksByEvent((allLinks ?? []) as PhotoLinkRow[]);
  const coverByEvent = new Map<string, PhotoLinkRow>();
  const pathsToSign: string[] = [];

  for (const event of eventRows) {
    const cover = pickCoverLink(linksByEvent.get(event.id) ?? []);
    if (!cover) continue;
    coverByEvent.set(event.id, cover);
    const photo = Array.isArray(cover.photos) ? cover.photos[0] : cover.photos;
    if (photo?.thumbnail_path) pathsToSign.push(photo.thumbnail_path);
  }

  const signedByPath = await signThumbnailsBatch(supabase, pathsToSign);

  return eventRows.map((event, index) => {
    const cover = coverByEvent.get(event.id);
    if (!cover) return mapEventRow(event, []);
    const photo = Array.isArray(cover.photos) ? cover.photos[0] : cover.photos;
    const thumbnailUrl = photo?.thumbnail_path
      ? (signedByPath.get(photo.thumbnail_path) ?? null)
      : null;
    const mapped = mapPhotoFromLink(cover, index, thumbnailUrl);
    return mapEventRow(event, mapped ? [mapped] : []);
  });
}

/** Timeline list: cover photo only + batch signed URLs. */
async function fetchPublishedMemoriesForOwner(
  ownerId: string,
): Promise<PublishedMemory[]> {
  const supabase = createServiceClient();
  const { data: events, error } = await supabase
    .from("memory_events")
    .select(
      "id, slug, title, subtitle, one_line, event_date, place_name, template_id, status, mood, chapter, published_at",
    )
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .order("published_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!events?.length) return [];

  const eventRows = events.map((event) => ({
    ...event,
    diary_body: null,
  })) as EventRow[];

  return hydrateEventsWithCovers(supabase, eventRows);
}

async function fetchPublishedTimelinePageForOwner(
  ownerId: string,
  filters: TimelineFilters,
  cursor: TimelineCursor | null,
  limit: number,
): Promise<TimelinePageResult> {
  const supabase = createServiceClient();
  let query = supabase
    .from("memory_events")
    .select(
      "id, slug, title, subtitle, one_line, event_date, place_name, template_id, status, mood, chapter, published_at",
    )
    .eq("owner_id", ownerId)
    .eq("status", "published");

  if (filters.chapter) {
    query = query.eq("chapter", filters.chapter);
  }
  if (filters.hasPlace) {
    query = query.not("place_name", "is", null).neq("place_name", "");
  }
  if (filters.eventDate) {
    query = query.eq("event_date", filters.eventDate);
  }
  if (cursor) {
    query = query.or(timelineCursorOrFilter(cursor));
  }

  const { data: events, error } = await query
    .order("event_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const rows = (events ?? []).map((event) => ({
    ...event,
    diary_body: null,
  })) as EventRow[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const memories = await hydrateEventsWithCovers(supabase, pageRows);
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? { eventDate: last.event_date, id: last.id }
      : null;

  return { memories, nextCursor };
}

export async function getPublishedTimelinePage(input: {
  filters?: TimelineFilters;
  cursor?: TimelineCursor | null;
  limit?: number;
} = {}): Promise<TimelinePageResult> {
  if (!isSupabaseConfigured()) {
    return { memories: [], nextCursor: null };
  }

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) {
    return { memories: [], nextCursor: null };
  }

  const filters = input.filters ?? {};
  const cursor = input.cursor ?? null;
  const limit = Math.min(
    Math.max(input.limit ?? TIMELINE_PAGE_SIZE, 1),
    50,
  );

  // Paginated pages are not Data-Cached (cursor cardinality); covers stay cheap via batch sign.
  return fetchPublishedTimelinePageForOwner(ownerId, filters, cursor, limit);
}

async function fetchPublishedChapterMetaForOwner(
  ownerId: string,
  chapterId: ChapterId,
): Promise<ChapterMeta> {
  const supabase = createServiceClient();

  let countQuery = supabase
    .from("memory_events")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("status", "published");
  countQuery = applyStoryChapterFilter(countQuery, chapterId);

  let firstQuery = supabase
    .from("memory_events")
    .select("event_date")
    .eq("owner_id", ownerId)
    .eq("status", "published");
  firstQuery = applyStoryChapterFilter(firstQuery, chapterId);

  let lastQuery = supabase
    .from("memory_events")
    .select("event_date")
    .eq("owner_id", ownerId)
    .eq("status", "published");
  lastQuery = applyStoryChapterFilter(lastQuery, chapterId);

  const [settingsResult, countResult, firstResult, lastResult] = await Promise.all([
    supabase
      .from("relationship_settings")
      .select("chapter_labels")
      .eq("owner_id", ownerId)
      .maybeSingle(),
    countQuery,
    firstQuery.order("event_date", { ascending: true }).limit(1).maybeSingle(),
    lastQuery.order("event_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (countResult.error) throw new Error(countResult.error.message);
  if (firstResult.error) throw new Error(firstResult.error.message);
  if (lastResult.error) throw new Error(lastResult.error.message);

  const labels = resolveChapterLabels(
    (settingsResult.data?.chapter_labels as Partial<
      Record<ChapterId, string>
    > | null) ?? null,
  );

  const count = countResult.count ?? 0;
  const firstDate = firstResult.data?.event_date ?? null;
  const lastDate = lastResult.data?.event_date ?? null;
  const dateRange =
    !firstDate || !lastDate
      ? ""
      : firstDate === lastDate
        ? firstDate
        : `${firstDate} — ${lastDate}`;

  return {
    title: labels[chapterId],
    count,
    dateRange,
  };
}

async function fetchPublishedChapterPageForOwner(
  ownerId: string,
  chapterId: ChapterId,
  cursor: TimelineCursor | null,
  limit: number,
): Promise<ChapterPageResult> {
  const supabase = createServiceClient();

  let query = supabase
    .from("memory_events")
    .select(
      "id, slug, title, subtitle, one_line, event_date, place_name, template_id, status, mood, chapter, published_at",
    )
    .eq("owner_id", ownerId)
    .eq("status", "published");

  query = applyStoryChapterFilter(query, chapterId);

  if (cursor) {
    query = query.or(chapterCursorOrFilter(cursor));
  }

  const { data: events, error } = await query
    .order("event_date", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const rows = (events ?? []).map((event) => ({
    ...event,
    diary_body: null,
  })) as EventRow[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const memories = await hydrateEventsWithCovers(supabase, pageRows);
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? { eventDate: last.event_date, id: last.id }
      : null;

  return { memories, nextCursor };
}

export async function getPublishedChapterMeta(
  chapterId: ChapterId,
): Promise<ChapterMeta> {
  if (!isSupabaseConfigured()) {
    return { title: resolveChapterLabels()[chapterId], count: 0, dateRange: "" };
  }

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) {
    return { title: resolveChapterLabels()[chapterId], count: 0, dateRange: "" };
  }

  return unstable_cache(
    () => fetchPublishedChapterMetaForOwner(ownerId, chapterId),
    ["chapter-meta", ownerId, chapterId],
    {
      revalidate: PUBLISHED_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLISHED_CACHE_TAG],
    },
  )();
}

export async function getPublishedChapterPage(input: {
  chapterId: ChapterId;
  cursor?: TimelineCursor | null;
  limit?: number;
}): Promise<ChapterPageResult> {
  if (!isSupabaseConfigured()) {
    return { memories: [], nextCursor: null };
  }

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) {
    return { memories: [], nextCursor: null };
  }

  const cursor = input.cursor ?? null;
  const limit = Math.min(
    Math.max(input.limit ?? CHAPTER_PAGE_SIZE, 1),
    50,
  );

  if (cursor) {
    return fetchPublishedChapterPageForOwner(
      ownerId,
      input.chapterId,
      cursor,
      limit,
    );
  }

  return unstable_cache(
    () =>
      fetchPublishedChapterPageForOwner(ownerId, input.chapterId, null, limit),
    ["chapter-page", ownerId, input.chapterId, String(limit)],
    {
      revalidate: PUBLISHED_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLISHED_CACHE_TAG],
    },
  )();
}

async function fetchPublishedCalendarDaysForOwner(
  ownerId: string,
): Promise<CalendarDayCount[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("memory_events")
    .select("event_date")
    .eq("owner_id", ownerId)
    .eq("status", "published");

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const date = row.event_date;
    if (!date) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPublishedCalendarDays(): Promise<CalendarDayCount[]> {
  if (!isSupabaseConfigured()) return [];

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return [];

  return unstable_cache(
    () => fetchPublishedCalendarDaysForOwner(ownerId),
    ["published-calendar-days", ownerId],
    {
      revalidate: PUBLISHED_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLISHED_CACHE_TAG],
    },
  )();
}

export async function getPublishedMemories(): Promise<PublishedMemory[]> {
  if (!isSupabaseConfigured()) return [];

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return [];

  return unstable_cache(
    () => fetchPublishedMemoriesForOwner(ownerId),
    ["published-memories", ownerId],
    {
      revalidate: PUBLISHED_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLISHED_CACHE_TAG],
    },
  )();
}

async function fetchPublishedMemoryBySlugForOwner(
  ownerId: string,
  slug: string,
): Promise<{
  memory: PublishedMemory;
  prev: PublishedMemoryNav | null;
  next: PublishedMemoryNav | null;
} | null> {
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
  const [photos, navRowsResult] = await Promise.all([
    loadPhotosForEvent(supabase, eventRow.id, 0),
    supabase
      .from("memory_events")
      .select("slug, title, event_date, published_at")
      .eq("owner_id", ownerId)
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .order("published_at", { ascending: true }),
  ]);

  const memory = mapEventRow(eventRow, photos);
  const { prev, next } = neighborsFromOrderedList(navRowsResult.data ?? [], slug);

  return {
    memory,
    prev: prev ? { slug: prev.slug, title: prev.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
  };
}

export async function getPublishedMemoryBySlug(slug: string): Promise<{
  memory: PublishedMemory;
  prev: PublishedMemoryNav | null;
  next: PublishedMemoryNav | null;
} | null> {
  if (!isSupabaseConfigured()) return null;

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return null;

  return unstable_cache(
    () => fetchPublishedMemoryBySlugForOwner(ownerId, slug),
    ["published-memory", ownerId, slug],
    {
      revalidate: PUBLISHED_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLISHED_CACHE_TAG],
    },
  )();
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

type StoryEventRow = {
  id: string;
  title: string;
  one_line: string | null;
  event_date: string;
  chapter: string | null;
};

async function fetchStoryChaptersForOwner(ownerId: string): Promise<StoryChapter[]> {
  const supabase = createServiceClient();

  const [eventsResult, settingsResult] = await Promise.all([
    supabase
      .from("memory_events")
      .select("id, title, one_line, event_date, chapter")
      .eq("owner_id", ownerId)
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .order("published_at", { ascending: true }),
    supabase
      .from("relationship_settings")
      .select("chapter_labels")
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ]);

  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const labels = resolveChapterLabels(
    (settingsResult.data?.chapter_labels as Partial<
      Record<ChapterId, string>
    > | null) ?? null,
  );

  const events = (eventsResult.data ?? []) as StoryEventRow[];
  const groups = new Map<string, StoryEventRow[]>();

  for (const event of events) {
    const key =
      event.chapter && isChapterKey(event.chapter, labels)
        ? event.chapter
        : "ordinary_days";
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  const orderedKeys = CHAPTER_IDS.filter((key) => (groups.get(key)?.length ?? 0) > 0);
  const eventIds = events.map((event) => event.id);
  const coverLinkByChapter = new Map<string, PhotoLinkRow>();
  if (eventIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from("event_photos")
      .select(
        "event_id, photo_id, role, sort_order, photos(id, original_filename, thumbnail_path, drive_file_id, width, height)",
      )
      .in("event_id", eventIds)
      .order("sort_order", { ascending: true });

    if (linksError) throw new Error(linksError.message);

    const linksByEvent = groupLinksByEvent((links ?? []) as PhotoLinkRow[]);
    for (const key of orderedKeys) {
      const chapterEvents = groups.get(key) ?? [];
      for (const event of chapterEvents) {
        const cover = pickCoverLink(linksByEvent.get(event.id) ?? []);
        const photo = cover
          ? Array.isArray(cover.photos)
            ? cover.photos[0]
            : cover.photos
          : null;
        if (cover && photo?.thumbnail_path) {
          coverLinkByChapter.set(key, cover);
          break;
        }
      }
    }
  }

  const pathsToSign = [...coverLinkByChapter.values()]
    .map((link) => {
      const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
      return photo?.thumbnail_path ?? null;
    })
    .filter((path): path is string => Boolean(path));

  const signedByPath = await signThumbnailsBatch(supabase, pathsToSign);

  return orderedKeys.map((key, index) => {
    const list = groups.get(key) ?? [];
    const dates = list.map((item) => item.event_date).sort();
    const first = list[0];
    const coverLink = coverLinkByChapter.get(key);
    const coverPhoto = coverLink
      ? Array.isArray(coverLink.photos)
        ? coverLink.photos[0]
        : coverLink.photos
      : null;
    const coverUrl = coverPhoto?.thumbnail_path
      ? (signedByPath.get(coverPhoto.thumbnail_path) ?? null)
      : null;

    return {
      id: key,
      title: labels[key as ChapterId] ?? key,
      count: list.length,
      oneLine: first?.one_line || first?.title || "",
      dateRange:
        dates.length === 0
          ? ""
          : dates[0] === dates[dates.length - 1]
            ? dates[0]
            : `${dates[0]} — ${dates[dates.length - 1]}`,
      coverUrl,
      coverGradient: gradientForIndex(index),
    };
  });
}

export async function getStoryChapters(): Promise<StoryChapter[]> {
  if (!isSupabaseConfigured()) return [];

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return [];

  return unstable_cache(
    () => fetchStoryChaptersForOwner(ownerId),
    ["story-chapters", ownerId],
    {
      revalidate: PUBLISHED_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLISHED_CACHE_TAG],
    },
  )();
}

function isChapterKey(value: string, labels: Record<string, string>) {
  return value in labels;
}
