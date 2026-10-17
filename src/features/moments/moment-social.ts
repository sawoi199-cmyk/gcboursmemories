import { MomentRequestError } from "@/features/moments/moment-errors";
import type { CreateCommentInput, SetLikeInput } from "@/features/moments/moment-schema";
import type { WishAuthor } from "@/features/wishes/wish-schema";
import type { createServiceClient } from "@/lib/supabase/admin";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type MomentComment = {
  id: string;
  author: WishAuthor;
  body: string;
  createdAt: string;
};

export type MomentSocial = {
  commentCount: number;
  likedBy: WishAuthor[];
};

export const EMPTY_SOCIAL: MomentSocial = { commentCount: 0, likedBy: [] };

const AUTHOR_ORDER: WishAuthor[] = ["partner", "owner"];

/** Stable partner-then-owner order so "who liked" reads the same everywhere. */
export function orderAuthors(authors: Iterable<WishAuthor>): WishAuthor[] {
  const set = new Set(authors);
  return AUTHOR_ORDER.filter((author) => set.has(author));
}

type CommentRow = { id: string; author: WishAuthor; body: string; created_at: string };

function toComment(row: CommentRow): MomentComment {
  return { id: row.id, author: row.author, body: row.body, createdAt: row.created_at };
}

/** Comment counts and likes for a page of moments, in two queries. */
export async function getSocialSummaries(
  supabase: ServiceClient,
  ownerId: string,
  momentIds: string[],
): Promise<Map<string, MomentSocial>> {
  const summaries = new Map<string, MomentSocial>();
  if (momentIds.length === 0) return summaries;

  const [comments, likes] = await Promise.all([
    supabase
      .from("moment_comments")
      .select("moment_id")
      .eq("owner_id", ownerId)
      .in("moment_id", momentIds),
    supabase
      .from("moment_likes")
      .select("moment_id, author")
      .eq("owner_id", ownerId)
      .in("moment_id", momentIds),
  ]);
  if (comments.error) throw new Error(comments.error.message);
  if (likes.error) throw new Error(likes.error.message);

  const countBy = new Map<string, number>();
  for (const row of (comments.data ?? []) as { moment_id: string }[]) {
    countBy.set(row.moment_id, (countBy.get(row.moment_id) ?? 0) + 1);
  }
  const likesBy = new Map<string, WishAuthor[]>();
  for (const row of (likes.data ?? []) as { moment_id: string; author: WishAuthor }[]) {
    likesBy.set(row.moment_id, [...(likesBy.get(row.moment_id) ?? []), row.author]);
  }
  for (const id of momentIds) {
    summaries.set(id, {
      commentCount: countBy.get(id) ?? 0,
      likedBy: orderAuthors(likesBy.get(id) ?? []),
    });
  }
  return summaries;
}

export async function listComments(
  supabase: ServiceClient,
  ownerId: string,
  momentId: string,
): Promise<MomentComment[]> {
  const { data, error } = await supabase
    .from("moment_comments")
    .select("id, author, body, created_at")
    .eq("owner_id", ownerId)
    .eq("moment_id", momentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CommentRow[]).map(toComment);
}

async function assertMomentExists(supabase: ServiceClient, ownerId: string, momentId: string) {
  const { data, error } = await supabase
    .from("moments")
    .select("id")
    .eq("id", momentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new MomentRequestError("找不到这条流光。", 404);
}

export async function addComment(
  supabase: ServiceClient,
  ownerId: string,
  momentId: string,
  input: CreateCommentInput,
): Promise<MomentComment> {
  await assertMomentExists(supabase, ownerId, momentId);
  const { data, error } = await supabase
    .from("moment_comments")
    .insert({ owner_id: ownerId, moment_id: momentId, author: input.author, body: input.body })
    .select("id, author, body, created_at")
    .single();
  if (error) throw new Error(error.message);
  return toComment(data as CommentRow);
}

/** Returns false when the comment does not exist on this moment for this owner. */
export async function deleteComment(
  supabase: ServiceClient,
  ownerId: string,
  momentId: string,
  commentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("moment_comments")
    .delete()
    .eq("id", commentId)
    .eq("moment_id", momentId)
    .eq("owner_id", ownerId)
    .select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** Like or unlike as one of the two of us; idempotent. Returns who likes it now. */
export async function setLike(
  supabase: ServiceClient,
  ownerId: string,
  momentId: string,
  input: SetLikeInput,
): Promise<WishAuthor[]> {
  await assertMomentExists(supabase, ownerId, momentId);
  const result = input.liked
    ? await supabase
        .from("moment_likes")
        .upsert(
          { owner_id: ownerId, moment_id: momentId, author: input.author },
          { onConflict: "moment_id,author", ignoreDuplicates: true },
        )
    : await supabase
        .from("moment_likes")
        .delete()
        .eq("owner_id", ownerId)
        .eq("moment_id", momentId)
        .eq("author", input.author);
  if (result.error) throw new Error(result.error.message);

  const summaries = await getSocialSummaries(supabase, ownerId, [momentId]);
  return summaries.get(momentId)?.likedBy ?? [];
}
