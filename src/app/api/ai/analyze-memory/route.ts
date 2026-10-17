import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeAndApplyMemoryDraft } from "@/features/diary-generation/analyze-memory";
import { GenerationModeSchema } from "@/lib/ai/types";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { invalidPayloadResponse } from "@/lib/validation/invalid-payload";

const BodySchema = z.object({
  memoryId: z.string().uuid(),
  tone: z.string().max(40).optional(),
  excludedDetails: z.string().max(1000).optional(),
  language: z.string().max(20).optional(),
  mode: GenerationModeSchema.optional(),
  preserveTitle: z.boolean().optional(),
  preserveOneLine: z.boolean().optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 503 });
    }

    const session = await requireSiteSession();
    if (!session.ok) {
      return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
    }

    const json: unknown = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return invalidPayloadResponse(parsed.error, {
        memoryId: "回忆 ID",
        tone: "语气",
        excludedDetails: "不要写进日记",
        language: "语言",
        mode: "生成方式",
        preserveTitle: "保留标题",
        preserveOneLine: "保留一句话",
      });
    }

    const result = await analyzeAndApplyMemoryDraft({
      ownerId: session.ownerId,
      memoryId: parsed.data.memoryId,
      tone: parsed.data.tone,
      excludedDetails: parsed.data.excludedDetails,
      language: parsed.data.language,
      mode: parsed.data.mode,
      preserveTitle: parsed.data.preserveTitle,
      preserveOneLine: parsed.data.preserveOneLine,
    });

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      analysis: result.analysis,
      applied: result.applied,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "AI generation failed. Photos and notes were kept.",
      },
      { status: 500 },
    );
  }
}
