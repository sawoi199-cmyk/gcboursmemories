import sharp from "sharp";
import { createAIProvider, getActiveAIProviderName } from "@/lib/ai";
import type {
  GenerationMode,
  MemoryAnalysisResult,
} from "@/lib/ai/types";
import { appConfig } from "@/config/app";
import { createServiceClient } from "@/lib/supabase/admin";

export type AnalyzeMemoryOptions = {
  ownerId: string;
  memoryId: string;
  tone?: string;
  excludedDetails?: string;
  language?: string;
  mode?: GenerationMode;
  preserveTitle?: boolean;
  preserveOneLine?: boolean;
};

export async function analyzeAndApplyMemoryDraft(options: AnalyzeMemoryOptions) {
  const supabase = createServiceClient();
  const mode: GenerationMode = options.mode ?? "title_and_diary";
  const preserveTitle = options.preserveTitle ?? false;
  const preserveOneLine = options.preserveOneLine ?? false;

  const { data: event, error } = await supabase
    .from("memory_events")
    .select(
      "id, title, one_line, diary_body, event_date, place_name, user_note, chapter, template_id",
    )
    .eq("id", options.memoryId)
    .eq("owner_id", options.ownerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) throw new Error("Memory not found.");

  const { data: settings } = await supabase
    .from("relationship_settings")
    .select("relationship_title, partner_name, owner_name, default_diary_tone, default_language")
    .eq("owner_id", options.ownerId)
    .maybeSingle();

  const { data: links, error: linksError } = await supabase
    .from("event_photos")
    .select("photo_id, sort_order, photos(id, original_filename, taken_at, latitude, longitude, thumbnail_path)")
    .eq("event_id", options.memoryId)
    .order("sort_order", { ascending: true });

  if (linksError) throw new Error(linksError.message);

  const photoObservations = [];
  const analysisImageDataUrls: string[] = [];

  for (const link of links ?? []) {
    const photo = Array.isArray(link.photos) ? link.photos[0] : link.photos;
    if (!photo) continue;

    photoObservations.push({
      photoId: photo.id,
      filename: photo.original_filename,
      takenAt: photo.taken_at,
      latitude: photo.latitude,
      longitude: photo.longitude,
    });

    if (photo.thumbnail_path && analysisImageDataUrls.length < 3) {
      // Most openai-compatible text models (e.g. Groq Qwen) reject image_url.
      // Opt in with AI_VISION=true when using a vision-capable model.
      if (process.env.AI_VISION !== "true") {
        continue;
      }
      const { data: signed } = await supabase.storage
        .from("memory-thumbnails")
        .createSignedUrl(photo.thumbnail_path, appConfig.signedUrlTtlSeconds);
      if (signed?.signedUrl) {
        try {
          const imageResponse = await fetch(signed.signedUrl);
          if (imageResponse.ok) {
            const bytes = Buffer.from(await imageResponse.arrayBuffer());
            const small = await sharp(bytes)
              .resize({ width: 512, height: 512, fit: "inside" })
              .jpeg({ quality: 70 })
              .toBuffer();
            analysisImageDataUrls.push(
              `data:image/jpeg;base64,${small.toString("base64")}`,
            );
          }
        } catch {
          // Vision images are optional; continue with metadata-only.
        }
      }
    }
  }

  const provider = createAIProvider();
  const providerName = getActiveAIProviderName();

  // Title is only fed to the model when preserveTitle is on (or diary_only needs alignment).
  const includeTitleAsInput = preserveTitle || mode === "diary_only";

  const analysis = await provider.analyzeMemory({
    language: options.language ?? settings?.default_language ?? "zh-CN",
    tone: options.tone ?? settings?.default_diary_tone ?? "温柔日记",
    userNote: event.user_note ?? "",
    excludedDetails: options.excludedDetails ?? "",
    relationshipContext: settings
      ? `${settings.relationship_title} · ${settings.owner_name} / ${settings.partner_name}`
      : "私人情侣时光档案",
    mode,
    preserveTitle,
    preserveOneLine,
    currentTitle: includeTitleAsInput ? event.title : null,
    currentOneLine: event.one_line,
    currentDiaryBody: event.diary_body,
    eventMetadata: {
      eventDate: event.event_date,
      placeName: event.place_name,
      chapter: event.chapter,
      photoCount: photoObservations.length,
    },
    photoObservations,
    analysisImageDataUrls,
  });

  const applied = await applyAnalysisToMemory({
    ownerId: options.ownerId,
    memoryId: options.memoryId,
    analysis,
    tone: options.tone ?? settings?.default_diary_tone ?? "温柔日记",
    mode,
    preserveTitle,
    preserveOneLine,
    previous: {
      title: event.title,
      oneLine: event.one_line,
      diaryBody: event.diary_body,
    },
  });

  return {
    analysis,
    applied,
    provider: providerName,
  };
}

async function applyAnalysisToMemory(input: {
  ownerId: string;
  memoryId: string;
  analysis: MemoryAnalysisResult;
  tone: string;
  mode: GenerationMode;
  preserveTitle: boolean;
  preserveOneLine: boolean;
  previous: {
    title: string;
    oneLine: string | null;
    diaryBody: string | null;
  };
}) {
  const supabase = createServiceClient();

  const nextTitle =
    input.preserveTitle || input.mode === "diary_only"
      ? input.previous.title
      : input.analysis.recommendedTitle;

  const nextOneLine =
    input.preserveOneLine || input.mode === "title_only"
      ? input.previous.oneLine
      : input.analysis.oneLine;

  const nextDiaryBody =
    input.mode === "title_only"
      ? (input.previous.diaryBody ?? input.analysis.diaryBody)
      : input.analysis.diaryBody;

  // Save previous version before replacing any content.
  if (input.previous.diaryBody || input.previous.title) {
    const { error: previousVersionError } = await supabase.from("diary_versions").insert({
      event_id: input.memoryId,
      title: input.previous.title,
      one_line: input.previous.oneLine,
      diary_body: input.previous.diaryBody ?? "",
      tone: "pre_ai",
      source: "user",
    });
    if (previousVersionError) throw new Error(previousVersionError.message);
  }

  const { error: aiVersionError } = await supabase.from("diary_versions").insert({
    event_id: input.memoryId,
    title: nextTitle,
    one_line: nextOneLine,
    diary_body: nextDiaryBody ?? input.analysis.diaryBody,
    tone: input.tone,
    source: "ai",
  });
  if (aiVersionError) throw new Error(aiVersionError.message);

  const { error: updateError } = await supabase
    .from("memory_events")
    .update({
      title: nextTitle,
      one_line: nextOneLine,
      diary_body: nextDiaryBody,
      ai_generated: true,
      ai_confidence: input.analysis.confidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);

  if (updateError) throw new Error(updateError.message);

  return {
    title: nextTitle,
    oneLine: nextOneLine,
    diaryBody: nextDiaryBody,
  };
}

export async function listDiaryVersions(ownerId: string, memoryId: string) {
  const supabase = createServiceClient();

  const { data: owned, error: ownedError } = await supabase
    .from("memory_events")
    .select("id")
    .eq("id", memoryId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (ownedError) throw new Error(ownedError.message);
  if (!owned) throw new Error("Memory not found.");

  const { data, error } = await supabase
    .from("diary_versions")
    .select("id, title, one_line, diary_body, tone, source, created_at")
    .eq("event_id", memoryId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function restoreDiaryVersion(input: {
  ownerId: string;
  memoryId: string;
  versionId: string;
}) {
  const supabase = createServiceClient();
  const versions = await listDiaryVersions(input.ownerId, input.memoryId);
  const version = versions.find((item) => item.id === input.versionId);
  if (!version) throw new Error("Version not found.");

  // Save current as user checkpoint before restore.
  const { data: current } = await supabase
    .from("memory_events")
    .select("title, one_line, diary_body")
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  if (current?.diary_body) {
    await supabase.from("diary_versions").insert({
      event_id: input.memoryId,
      title: current.title,
      one_line: current.one_line,
      diary_body: current.diary_body,
      tone: "user",
      source: "user",
    });
  }

  const { error } = await supabase
    .from("memory_events")
    .update({
      title: version.title,
      one_line: version.one_line,
      diary_body: version.diary_body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);

  if (error) throw new Error(error.message);
  return { ok: true as const };
}
