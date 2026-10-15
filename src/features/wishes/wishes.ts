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

export type Wish = {
  id: string;
  title: string;
  note: string | null;
  author: WishAuthor;
  status: WishStatus;
  doneOn: string | null;
  createdAt: string;
};

type WishRow = {
  id: string;
  title: string;
  note: string | null;
  author: WishAuthor;
  status: WishStatus;
  done_on: string | null;
  created_at: string;
};

const WISH_COLUMNS = "id, title, note, author, status, done_on, created_at";

function toWish(row: WishRow): Wish {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    author: row.author,
    status: row.status,
    doneOn: row.done_on,
    createdAt: row.created_at,
  };
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

  const [wishesResult, names] = await Promise.all([
    createServiceClient()
      .from("wishes")
      .select(WISH_COLUMNS)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    getCoupleNames(ownerId),
  ]);

  if (wishesResult.error) throw new Error(wishesResult.error.message);

  return {
    wishes: (wishesResult.data as WishRow[]).map(toWish),
    names,
  };
}

export async function createWish(ownerId: string, input: CreateWishInput): Promise<Wish> {
  const { data, error } = await createServiceClient()
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
  return toWish(data as WishRow);
}

/** Returns null when the wish does not exist for this owner. */
export async function updateWish(
  ownerId: string,
  id: string,
  input: UpdateWishInput,
): Promise<Wish | null> {
  const { data, error } = await createServiceClient()
    .from("wishes")
    .update(toWishRowUpdate(input))
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select(WISH_COLUMNS)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toWish(data as WishRow) : null;
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
