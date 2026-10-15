import { getCoupleNames, type CoupleNames } from "@/features/relationship-profile/couple-names";
import {
  findUnreferencedPhotoIds,
  hardDeletePhotos,
} from "@/features/photos/hard-delete-photos";
import { uploadPhotoForOwner } from "@/features/uploads/upload-photo";
import {
  MOMENTS_PAGE_SIZE,
  momentCursorOrFilter,
  type CreateMomentFields,
  type MomentCursor,
  type UpdateMomentInput,
} from "@/features/moments/moment-schema";
import type { WishAuthor } from "@/features/wishes/wish-schema";
import { tryGetSiteOwnerId } from "@/lib/config/site-owner";
import type { UploadExifMeta } from "@/lib/image/compress-for-upload";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signThumbnailsBatch } from "@/lib/supabase/sign-thumbnails";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type MomentTile = {
  id: string;
  seq: number;
  caption: string;
  takenOn: string;
  thumbnailUrl: string | null;
};

export type MomentDetail = MomentTile & {
  photoId: string;
  author: WishAuthor;
  width: number | null;
  height: number | null;
  wish: { id: string; title: string } | null;
};

export type MomentsPage = {
  moments: MomentTile[];
  nextCursor: MomentCursor | null;
};

/** Expected request problems mapped to an HTTP status by the API routes. */
export class MomentRequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

type PhotoEmbed = { thumbnail_path: string | null; width: number | null; height: number | null };

type MomentRow = {
  id: string;
  seq: number;
  caption: string;
  taken_on: string;
  author: WishAuthor;
  photo_id: string;
  photo: PhotoEmbed | PhotoEmbed[] | null;
};

const MOMENT_COLUMNS =
  "id, seq, caption, taken_on, author, photo_id, photo:photos(thumbnail_path, width, height)";

function embeddedPhoto(row: MomentRow): PhotoEmbed | null {
  return Array.isArray(row.photo) ? (row.photo[0] ?? null) : row.photo;
}

async function signRows(supabase: ServiceClient, rows: MomentRow[]) {
  const paths = rows
    .map((row) => embeddedPhoto(row)?.thumbnail_path)
    .filter((path): path is string => Boolean(path));
  const signed = await signThumbnailsBatch(supabase, paths);
  return (row: MomentRow) => {
    const path = embeddedPhoto(row)?.thumbnail_path;
    return path ? (signed.get(path) ?? null) : null;
  };
}

function toTile(row: MomentRow, thumbnailUrl: string | null): MomentTile {
  return {
    id: row.id,
    seq: row.seq,
    caption: row.caption,
    takenOn: row.taken_on,
    thumbnailUrl,
  };
}

export async function listMoments(
  ownerId: string,
  cursor: MomentCursor | null,
  limit = MOMENTS_PAGE_SIZE,
): Promise<MomentsPage> {
  const supabase = createServiceClient();
  let query = supabase.from("moments").select(MOMENT_COLUMNS).eq("owner_id", ownerId);
  if (cursor) query = query.or(momentCursorOrFilter(cursor));

  const { data, error } = await query
    .order("taken_on", { ascending: false })
    .order("seq", { ascending: false })
    .limit(limit + 1);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MomentRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const urlFor = await signRows(supabase, pageRows);
  const last = pageRows[pageRows.length - 1];

  return {
    moments: pageRows.map((row) => toTile(row, urlFor(row))),
    nextCursor: hasMore && last ? { takenOn: last.taken_on, seq: last.seq } : null,
  };
}

export type MomentsFeed = MomentsPage & { names: CoupleNames };

/** Read side for /moments; the route is gated by the site-session proxy. */
export async function getMomentsFeed(): Promise<MomentsFeed | null> {
  if (!isSupabaseConfigured()) return null;
  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return null;

  const [page, names] = await Promise.all([listMoments(ownerId, null), getCoupleNames(ownerId)]);
  return { ...page, names };
}

async function loadMomentDetail(
  supabase: ServiceClient,
  ownerId: string,
  id: string,
): Promise<MomentDetail | null> {
  const [momentResult, wishResult] = await Promise.all([
    supabase
      .from("moments")
      .select(MOMENT_COLUMNS)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle(),
    supabase
      .from("wishes")
      .select("id, title")
      .eq("moment_id", id)
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ]);
  if (momentResult.error) throw new Error(momentResult.error.message);
  if (wishResult.error) throw new Error(wishResult.error.message);
  if (!momentResult.data) return null;

  const row = momentResult.data as MomentRow;
  const urlFor = await signRows(supabase, [row]);
  const photo = embeddedPhoto(row);
  return {
    ...toTile(row, urlFor(row)),
    photoId: row.photo_id,
    author: row.author,
    width: photo?.width ?? null,
    height: photo?.height ?? null,
    wish: wishResult.data ? { id: wishResult.data.id, title: wishResult.data.title } : null,
  };
}

export async function getMomentPage(
  id: string,
): Promise<{ moment: MomentDetail; names: CoupleNames } | null> {
  if (!isSupabaseConfigured()) return null;
  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return null;

  const [moment, names] = await Promise.all([
    loadMomentDetail(createServiceClient(), ownerId, id),
    getCoupleNames(ownerId),
  ]);
  return moment ? { moment, names } : null;
}

async function assertWishLinkable(supabase: ServiceClient, ownerId: string, wishId: string) {
  const { data, error } = await supabase
    .from("wishes")
    .select("id, status, moment_id")
    .eq("id", wishId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new MomentRequestError("找不到这个愿望。", 404);
  if (data.status !== "done") {
    throw new MomentRequestError("愿望要先标记为实现，才能关联流光。", 400);
  }
  if (data.moment_id) throw new MomentRequestError("这个愿望已经有一条流光了。", 409);
}

/**
 * Upload the photo, insert the moment and (optionally) attach it to a fulfilled wish.
 * The wish is checked before uploading so a bad link never leaves files behind.
 */
export async function createMoment(input: {
  ownerId: string;
  file: File;
  clientExif: UploadExifMeta | null;
  fields: CreateMomentFields;
}): Promise<{ moment: MomentDetail; warnings: string[] }> {
  const supabase = createServiceClient();
  const { fields } = input;
  if (fields.wishId) await assertWishLinkable(supabase, input.ownerId, fields.wishId);

  const photo = await uploadPhotoForOwner({
    ownerId: input.ownerId,
    file: input.file,
    clientExif: input.clientExif,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("moments")
    .insert({
      owner_id: input.ownerId,
      photo_id: photo.id,
      caption: fields.caption,
      taken_on: fields.takenOn,
      author: fields.author,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await hardDeletePhotos(input.ownerId, [photo.id]);
    throw new Error(insertError?.message ?? "保存流光失败");
  }

  const warnings: string[] = [];
  if (fields.wishId) {
    const { data: linked, error: linkError } = await supabase
      .from("wishes")
      .update({ moment_id: inserted.id })
      .eq("id", fields.wishId)
      .eq("owner_id", input.ownerId)
      .is("moment_id", null)
      .select("id");
    if (linkError || (linked?.length ?? 0) === 0) {
      warnings.push("流光已发布，但没能关联到愿望。");
    }
  }

  const moment = await loadMomentDetail(supabase, input.ownerId, inserted.id);
  if (!moment) throw new Error("保存流光失败");
  return { moment, warnings };
}

/** Returns null when the moment does not exist for this owner. */
export async function updateMoment(
  ownerId: string,
  id: string,
  input: UpdateMomentInput,
): Promise<MomentDetail | null> {
  const supabase = createServiceClient();
  const update: { caption?: string; taken_on?: string } = {};
  if (input.caption !== undefined) update.caption = input.caption;
  if (input.takenOn !== undefined) update.taken_on = input.takenOn;

  const { data, error } = await supabase
    .from("moments")
    .update(update)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return loadMomentDetail(supabase, ownerId, id);
}

/**
 * Delete the moment row first (a linked wish keeps its done state; FK clears
 * `moment_id`), then hard-delete the photo once nothing references it.
 */
export async function deleteMoment(
  ownerId: string,
  id: string,
): Promise<{ deleted: boolean; warnings: string[] }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("moments")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("photo_id");
  if (error) throw new Error(error.message);

  const photoIds = (data ?? []).map((row) => row.photo_id as string);
  if (photoIds.length === 0) return { deleted: false, warnings: [] };

  const orphans = await findUnreferencedPhotoIds(photoIds);
  const cleanup = await hardDeletePhotos(ownerId, orphans);
  return { deleted: true, warnings: cleanup.warnings };
}
