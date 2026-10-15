import { z } from "zod";
import { LayoutJsonSchema, MomentLayoutSchema } from "@/features/moments/moment-layout";
import { WishAuthorSchema } from "@/features/wishes/wish-schema";
import { IsoDateSchema } from "@/lib/utils/iso-date";

export const MOMENT_CAPTION_MAX = 140;
export const MOMENTS_PAGE_SIZE = 30;

const CaptionSchema = z.string().trim().min(1).max(MOMENT_CAPTION_MAX);

/** Text fields of the multipart POST /api/moments body (the photo travels as `file`). */
export const CreateMomentFieldsSchema = z.object({
  caption: CaptionSchema,
  takenOn: IsoDateSchema,
  author: WishAuthorSchema,
  wishId: z.uuid().optional(),
  /** JSON-encoded MomentLayout; omitted → simple template. */
  layout: LayoutJsonSchema.optional(),
});
export type CreateMomentFields = z.infer<typeof CreateMomentFieldsSchema>;

export const UpdateMomentSchema = z
  .object({
    caption: CaptionSchema.optional(),
    takenOn: IsoDateSchema.optional(),
    author: WishAuthorSchema.optional(),
    layout: MomentLayoutSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Nothing to update",
  });
export type UpdateMomentInput = z.infer<typeof UpdateMomentSchema>;

export type MomentCursor = {
  takenOn: string;
  seq: number;
};

export const MomentCursorQuerySchema = z
  .object({
    cursorDate: IsoDateSchema.optional(),
    cursorSeq: z.coerce.number().int().positive().optional(),
  })
  .refine((value) => (value.cursorDate === undefined) === (value.cursorSeq === undefined), {
    message: "cursorDate and cursorSeq must be paired",
  });

/** PostgREST filter: older moments when ordered by taken_on desc, seq desc. */
export function momentCursorOrFilter(cursor: MomentCursor): string {
  return `taken_on.lt.${cursor.takenOn},and(taken_on.eq.${cursor.takenOn},seq.lt.${cursor.seq})`;
}

/** Read optional string fields from multipart form data for Zod. */
export function momentFieldsFromForm(form: FormData) {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };
  return {
    caption: text("caption"),
    takenOn: text("takenOn"),
    author: text("author"),
    wishId: text("wishId"),
    layout: text("layout"),
  };
}
