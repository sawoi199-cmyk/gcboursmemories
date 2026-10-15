import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, uploadPhotoForOwner, hardDeletePhotos } = vi.hoisted(() => ({
  from: vi.fn(),
  uploadPhotoForOwner: vi.fn(),
  hardDeletePhotos: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: () => ({
    from,
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
  }),
}));
vi.mock("@/features/uploads/upload-photo", () => ({ uploadPhotoForOwner }));
vi.mock("@/features/photos/hard-delete-photos", () => ({
  hardDeletePhotos,
  findUnreferencedPhotoIds: async (ids: string[]) => ids,
}));

import { MomentRequestError, createMoment } from "@/features/moments/moments";

const OWNER = "owner-1";
const WISH_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

/** Minimal chainable PostgREST stand-in: every call returns itself, awaiting yields `result`. */
function query(result: { data: unknown; error: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "in", "insert", "update", "delete", "order", "limit", "or"]) {
    builder[method] = () => builder;
  }
  builder.single = async () => result;
  builder.maybeSingle = async () => result;
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function input(wishId?: string) {
  return {
    ownerId: OWNER,
    file: new File(["x"], "sea.jpg", { type: "image/jpeg" }),
    clientExif: null,
    fields: { caption: "海边", takenOn: "2026-10-15", author: "partner" as const, wishId },
  };
}

describe("createMoment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadPhotoForOwner.mockResolvedValue({ id: "photo-1" });
    hardDeletePhotos.mockResolvedValue({ deleted: ["photo-1"], warnings: [] });
  });

  it("refuses to link a wish that is not fulfilled, before uploading anything", async () => {
    from.mockImplementation(() =>
      query({ data: { id: WISH_ID, status: "wish", moment_id: null }, error: null }),
    );

    await expect(createMoment(input(WISH_ID))).rejects.toBeInstanceOf(MomentRequestError);
    expect(uploadPhotoForOwner).not.toHaveBeenCalled();
  });

  it("refuses a wish that already has a moment", async () => {
    from.mockImplementation(() =>
      query({ data: { id: WISH_ID, status: "done", moment_id: "m-old" }, error: null }),
    );

    await expect(createMoment(input(WISH_ID))).rejects.toMatchObject({ status: 409 });
    expect(uploadPhotoForOwner).not.toHaveBeenCalled();
  });

  it("removes the uploaded photo when the moment row cannot be saved", async () => {
    from.mockImplementation((table: string) =>
      table === "moments"
        ? query({ data: null, error: { message: "insert failed" } })
        : query({ data: null, error: null }),
    );

    await expect(createMoment(input())).rejects.toThrow("insert failed");
    expect(hardDeletePhotos).toHaveBeenCalledWith(OWNER, ["photo-1"]);
  });
});
