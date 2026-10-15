import { appConfig } from "@/config/app";
import type { createServiceClient } from "@/lib/supabase/admin";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Batch-sign private thumbnail paths. Call per request — never cache the
 * resulting URLs (Decision 017).
 */
export async function signThumbnailsBatch(
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
