import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: () => ({ from }),
}));

import { findUnreferencedPhotoIds } from "@/features/photos/hard-delete-photos";

function linksFor(rows: { photo_id: string }[]) {
  return { select: () => ({ in: async () => ({ data: rows, error: null }) }) };
}

describe("findUnreferencedPhotoIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps photos used by memory events or moments", async () => {
    from.mockImplementation((table: string) =>
      table === "event_photos" ? linksFor([{ photo_id: "in-event" }]) : linksFor([{ photo_id: "in-moment" }]),
    );

    await expect(
      findUnreferencedPhotoIds(["in-event", "in-moment", "orphan"]),
    ).resolves.toEqual(["orphan"]);
    expect(from).toHaveBeenCalledWith("event_photos");
    expect(from).toHaveBeenCalledWith("moments");
  });

  it("fails closed when a reference lookup errors", async () => {
    from.mockImplementation((table: string) =>
      table === "moments"
        ? { select: () => ({ in: async () => ({ data: null, error: { message: "boom" } }) }) }
        : linksFor([]),
    );

    await expect(findUnreferencedPhotoIds(["a"])).rejects.toThrow("boom");
  });
});
