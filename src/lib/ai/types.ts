import { z } from "zod";

export const TitleCandidateKindSchema = z.enum(["event", "emotion", "detail"]);

export const TitleCandidateSchema = z.object({
  kind: TitleCandidateKindSchema,
  text: z.string().min(1).max(80),
});

export const MemoryAnalysisSchema = z
  .object({
    titleCandidates: z.array(TitleCandidateSchema).length(3),
    recommendedTitle: z.string().min(1).max(80),
    oneLine: z.string().min(1).max(160),
    diaryBody: z.string().min(50).max(3000),
    factsUsed: z.array(z.string()).max(15),
    inferredFacts: z.array(z.string()).max(10),
    questionsToConfirm: z.array(z.string()).max(5),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((value, ctx) => {
    const kinds = new Set(value.titleCandidates.map((item) => item.kind));
    for (const kind of TitleCandidateKindSchema.options) {
      if (!kinds.has(kind)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `titleCandidates must include one "${kind}" title`,
          path: ["titleCandidates"],
        });
      }
    }
  });

export type MemoryAnalysisResult = z.infer<typeof MemoryAnalysisSchema>;
export type TitleCandidate = z.infer<typeof TitleCandidateSchema>;

export const GenerationModeSchema = z.enum([
  "title_and_diary",
  "title_only",
  "diary_only",
]);

export type GenerationMode = z.infer<typeof GenerationModeSchema>;

export type MemoryAnalysisInput = {
  language: string;
  tone: string;
  userNote: string;
  excludedDetails: string;
  relationshipContext: string;
  mode: GenerationMode;
  preserveTitle: boolean;
  preserveOneLine: boolean;
  /** Only included when preserveTitle is true (or diary_only needs alignment). */
  currentTitle: string | null;
  currentOneLine: string | null;
  currentDiaryBody: string | null;
  eventMetadata: {
    eventDate: string;
    placeName: string | null;
    chapter: string | null;
    photoCount: number;
  };
  photoObservations: Array<{
    photoId: string;
    filename: string;
    takenAt: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  /** Optional low-res JPEG data URLs for multimodal providers */
  analysisImageDataUrls?: string[];
};

export interface AIProvider {
  analyzeMemory(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult>;
}
