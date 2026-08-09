import { tryGetSiteOwnerId } from "@/lib/config/site-owner";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type PublishedLetter = {
  id: string;
  title: string;
  body: string;
  letterDate: string | null;
  replyBody: string | null;
};

export async function getPublishedLetter(): Promise<PublishedLetter | null> {
  if (!isSupabaseConfigured()) return null;

  const ownerId = tryGetSiteOwnerId();
  if (!ownerId) return null;

  const { data, error } = await createServiceClient()
    .from("letters")
    .select("id, title, body, letter_date")
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("letter_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: reply, error: replyError } = await createServiceClient()
    .from("letter_replies")
    .select("body")
    .eq("owner_id", ownerId)
    .eq("letter_id", data.id)
    .maybeSingle();

  if (replyError) throw new Error(replyError.message);

  return {
    id: data.id,
    title: data.title,
    body: data.body,
    letterDate: data.letter_date,
    replyBody: reply?.body ?? null,
  };
}
