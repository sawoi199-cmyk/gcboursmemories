import { LetterContent } from "@/components/experience/letter-content";
import { mockLetter } from "@/config/mock-data";
import { getPublishedLetter } from "@/features/letters/get-published-letter";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function LetterPage() {
  const letter = await getPublishedLetter();

  return <LetterContent letter={letter ?? mockLetter} canReply={isSupabaseConfigured()} />;
}
