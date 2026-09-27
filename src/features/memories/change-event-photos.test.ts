import { describe, expect, it } from "vitest";
import {
  MAX_EVENT_PHOTOS,
  nextAppendSlot,
  planReplacePhoto,
} from "@/features/memories/change-event-photos";

const slots = [
  { photoId: "00000000-0000-4000-8000-000000000001", sortOrder: 0, role: "cover" },
  { photoId: "00000000-0000-4000-8000-000000000002", sortOrder: 1, role: "detail" },
];

describe("planReplacePhoto", () => {
  it("keeps sort order and role, and moves the cover id", () => {
    const plan = planReplacePhoto({
      slots,
      oldPhotoId: slots[0].photoId,
      newPhotoId: "00000000-0000-4000-8000-000000000099",
      coverPhotoId: slots[0].photoId,
    });
    expect(plan.sortOrder).toBe(0);
    expect(plan.role).toBe("cover");
    expect(plan.nextCoverPhotoId).toBe("00000000-0000-4000-8000-000000000099");
    expect(plan.coverChanged).toBe(true);
  });

  it("leaves the cover id when replacing a non-cover photo", () => {
    const plan = planReplacePhoto({
      slots,
      oldPhotoId: slots[1].photoId,
      newPhotoId: "00000000-0000-4000-8000-000000000099",
      coverPhotoId: slots[0].photoId,
    });
    expect(plan.sortOrder).toBe(1);
    expect(plan.role).toBe("detail");
    expect(plan.coverChanged).toBe(false);
  });

  it("rejects a photo that is not on the memory", () => {
    expect(() =>
      planReplacePhoto({
        slots,
        oldPhotoId: "00000000-0000-4000-8000-000000000077",
        newPhotoId: "00000000-0000-4000-8000-000000000099",
        coverPhotoId: slots[0].photoId,
      }),
    ).toThrow(/not on this memory/);
  });
});

describe("nextAppendSlot", () => {
  it("appends as detail after existing photos", () => {
    expect(nextAppendSlot(3)).toEqual({
      sortOrder: 3,
      role: "detail",
      setCover: false,
    });
  });

  it("uses the first photo as cover when the memory is empty", () => {
    expect(nextAppendSlot(0)).toEqual({
      sortOrder: 0,
      role: "cover",
      setCover: true,
    });
  });

  it("stops at the memory photo cap", () => {
    expect(() => nextAppendSlot(MAX_EVENT_PHOTOS)).toThrow(/100/);
  });
});
