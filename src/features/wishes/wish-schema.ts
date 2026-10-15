import { z } from "zod";
import { IsoDateSchema } from "@/lib/utils/iso-date";

export const WISH_TITLE_MAX = 60;
export const WISH_NOTE_MAX = 300;

export const WishAuthorSchema = z.enum(["owner", "partner"]);
export type WishAuthor = z.infer<typeof WishAuthorSchema>;

export const WishStatusSchema = z.enum(["wish", "done"]);
export type WishStatus = z.infer<typeof WishStatusSchema>;

const TitleSchema = z.string().trim().min(1).max(WISH_TITLE_MAX);

/** Empty / whitespace-only notes are stored as null. */
const NoteSchema = z
  .string()
  .trim()
  .max(WISH_NOTE_MAX)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable();

export const CreateWishSchema = z.object({
  title: TitleSchema,
  note: NoteSchema.optional(),
  author: WishAuthorSchema,
});
export type CreateWishInput = z.infer<typeof CreateWishSchema>;

export const UpdateWishSchema = z
  .object({
    title: TitleSchema.optional(),
    note: NoteSchema.optional(),
    author: WishAuthorSchema.optional(),
    status: WishStatusSchema.optional(),
    doneOn: IsoDateSchema.optional(),
  })
  .refine((value) => value.status !== "done" || value.doneOn !== undefined, {
    message: "doneOn is required when marking a wish done",
    path: ["doneOn"],
  })
  .refine((value) => value.doneOn === undefined || value.status === "done", {
    message: "doneOn can only be set together with status=done",
    path: ["doneOn"],
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Nothing to update",
  });
export type UpdateWishInput = z.infer<typeof UpdateWishSchema>;

export type WishRowUpdate = {
  title?: string;
  note?: string | null;
  author?: WishAuthor;
  status?: WishStatus;
  done_on?: string | null;
  moment_id?: null;
};

/** Map a validated PATCH body to DB columns, keeping status and done_on in sync. */
export function toWishRowUpdate(input: UpdateWishInput): WishRowUpdate {
  const update: WishRowUpdate = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.note !== undefined) update.note = input.note;
  if (input.author !== undefined) update.author = input.author;
  if (input.status === "done") {
    update.status = "done";
    update.done_on = input.doneOn;
  } else if (input.status === "wish") {
    update.status = "wish";
    update.done_on = null;
    // A reverted wish is no longer "fulfilled" by its moment; the moment itself stays.
    update.moment_id = null;
  }
  return update;
}
