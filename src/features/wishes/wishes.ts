import { getCoupleNames, type CoupleNames } from "@/features/relationship-profile/couple-names";
import {
  toWishRowUpdate,
  type CreateWishInput,
  type UpdateWishInput,
  type WishAuthor,
  type WishStatus,
} from "@/features/wishes/wish-schema";
import { tryGetSiteOwnerId } from "@/lib/config/site-owner";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signThumbnailsBatch } from "@/lib/supabase/sign-thumbnails";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type WishMoment = {
  id: string;
  thumbnailUrl: string | null;
};

export type Wish = {
  id: string;
  title: string;
  note: string | null;
  author: WishAuthor;
  status: WishStatus;
  doneOn: string | null;
  createdAt: string;
  moment: WishMoment | null;
};

type WishRow = {
  id: string;
  title: string;
  note: string | null;
  author: WishAuthor;
  status: WishStatus;
  done_on: string | null;
  moment_id: string | null;
  created_at: string;
};

const WISH_COLUMNS = "id, title, note, author, status, done_on, moment_id, created_at";

function toWish(row: WishRow, moment: WishMoment | null): Wish {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    author: row.author,
    status: row.status,
    doneOn: row.done_on,
    createdAt: row.created_at,
    moment,
  };
}

type MomentThumbRow = {
  id: string;
  photo: { thumbnail_path: string | null } | { thumbnail_path: string | null }[] | null;
};

/** Attach freshly signed moment thumbnails to wish rows (never cached, Decision 017). */
async function hydrateWishes(supabase: ServiceClient, rows: WishRow[]): Promise<Wish[]> {
  const momentIds = rows.map((row) => row.moment_id).filter((id): id is string => Boolean(id));
  if (momentIds.length === 0) return rows.map((row) => toWish(row, null));

  const { data, error } = await supabase
    .from("moments")
    .select("id, photo:photos(thumbnail_path)")
    .in("id", momentIds);
  if (error) throw new Error(error.message);

  const pathByMoment = new Map<string, string | null>();
  for (const moment of (data ?? []) as MomentThumbRow[]) {
    const photo = Array.isArray(moment.photo) ? moment.photo[0] : moment.photo;
    pathByMoment.set(moment.id, photo?.thumbnail_path ?? null);
  }
  const signed = await signThumbnailsBatch(
    supabase,
    [...pathByMoment.values()].filter((path): path is string => Boolean(path)),
  );

  return rows.map((row) => {
    if (!row.moment_id || !pathByMoment.has(row.moment_id)) return toWish(row, null);
    const path = pathByMoment.get(row.moment_id);
    return toWish(row, { id: row.moment_id, thumbnailUrl: path ? (signed.get(path) ?? null) : null });
  });
}

export type WishBoard = {
  wishes: Wish[];
  names: CoupleNames;
};

/** Read side for /wishes; route is gated by the site-session proxy. */
export async function getWishBoard(): Promise<WishBoard | null> {
  if (!isSupabaseConfigured()) return null;
  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return null;

  const supabase = createServiceClient();
  const [wishesResult, names] = await Promise.all([
    supabase
      .from("wishes")
      .select(WISH_COLUMNS)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    getCoupleNames(ownerId),
  ]);

  if (wishesResult.error) throw new Error(wishesResult.error.message);

  return {
    wishes: await hydrateWishes(supabase, wishesResult.data as WishRow[]),
    names,
  };
}

export async function createWish(ownerId: string, input: CreateWishInput): Promise<Wish> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wishes")
    .insert({
      owner_id: ownerId,
      title: input.title,
      note: input.note ?? null,
      author: input.author,
    })
    .select(WISH_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  const [wish] = await hydrateWishes(supabase, [data as WishRow]);
  return wish;
}

/** Returns null when the wish does not exist for this owner. */
export async function updateWish(
  ownerId: string,
  id: string,
  input: UpdateWishInput,
): Promise<Wish | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wishes")
    .update(toWishRowUpdate(input))
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select(WISH_COLUMNS)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const [wish] = await hydrateWishes(supabase, [data as WishRow]);
  return wish;
}

/** Returns false when the wish does not exist for this owner. */
export async function deleteWish(ownerId: string, id: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("wishes")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
