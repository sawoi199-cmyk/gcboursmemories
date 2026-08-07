import { describe, expect, it } from "vitest";
import {
  appendExifToFormData,
  jpegNameFromOriginal,
  isHeicLikeFile,
  parseUploadExifFromForm,
} from "@/lib/image/compress-for-upload";

describe("compress-for-upload helpers", () => {
  it("renames extensions to .jpg", () => {
    expect(jpegNameFromOriginal("DJI_0112_D.JPG")).toBe("DJI_0112_D.jpg");
    expect(jpegNameFromOriginal("trip.png")).toBe("trip.jpg");
  });

  it("detects HEIC by mime or extension", () => {
    expect(
      isHeicLikeFile(new File([], "a.heic", { type: "image/heic" })),
    ).toBe(true);
    expect(isHeicLikeFile(new File([], "a.HEIF", { type: "" }))).toBe(true);
    expect(
      isHeicLikeFile(new File([], "a.jpg", { type: "image/jpeg" })),
    ).toBe(false);
  });

  it("round-trips EXIF fields through FormData", () => {
    const form = new FormData();
    appendExifToFormData(form, {
      takenAt: "2026-06-06T02:39:54.000Z",
      takenAtSource: "exif",
      latitude: 1.85,
      longitude: 103.3,
      orientation: 1,
      cameraModel: "DJI",
      width: 2560,
      height: 1440,
    });

    expect(parseUploadExifFromForm(form)).toEqual({
      takenAt: "2026-06-06T02:39:54.000Z",
      takenAtSource: "exif",
      latitude: 1.85,
      longitude: 103.3,
      orientation: 1,
      cameraModel: "DJI",
      width: 2560,
      height: 1440,
    });
  });
});
