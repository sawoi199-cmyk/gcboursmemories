import { appConfig } from "@/config/app";
import { normalizeExifInput, type ParsedExif } from "@/lib/exif/parse-exif";

const HEIC_LIKE = /image\/hei[cf]|image\/heic-sequence|image\/heif-sequence/i;

export type UploadExifMeta = {
  takenAt: string | null;
  takenAtSource: ParsedExif["takenAtSource"];
  latitude: number | null;
  longitude: number | null;
  orientation: number | null;
  cameraModel: string | null;
  width: number | null;
  height: number | null;
};

export type PreparedUpload = {
  file: File;
  exif: UploadExifMeta;
  compressed: boolean;
};

export function isHeicLikeFile(file: File) {
  if (HEIC_LIKE.test(file.type)) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

export function jpegNameFromOriginal(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.jpg`;
}

function parsedToUploadMeta(parsed: ParsedExif): UploadExifMeta {
  return {
    takenAt: parsed.takenAt?.toISOString() ?? null,
    takenAtSource: parsed.takenAtSource,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    orientation: parsed.orientation,
    cameraModel: parsed.cameraModel,
    width: parsed.width,
    height: parsed.height,
  };
}

async function readClientExif(file: File): Promise<UploadExifMeta> {
  try {
    const exifr = await import("exifr");
    const raw = await exifr.parse(file, {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "GPSLatitude",
        "GPSLongitude",
        "Orientation",
        "Model",
        "ImageWidth",
        "ImageHeight",
        "ExifImageWidth",
        "ExifImageHeight",
      ],
    });
    return parsedToUploadMeta(
      normalizeExifInput({
        ...(raw ?? {}),
        fileLastModified: file.lastModified
          ? new Date(file.lastModified)
          : null,
      }),
    );
  } catch {
    return parsedToUploadMeta(
      normalizeExifInput({
        fileLastModified: file.lastModified
          ? new Date(file.lastModified)
          : null,
      }),
    );
  }
}

async function decodeBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
    } catch {
      // Fall through to <img> decode.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to decode image for compression."));
      img.src = url;
    });
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasToJpegBlob(
  source: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available for image compression.");
  }
  ctx.drawImage(source, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
  });
  if (!blob) {
    throw new Error("JPEG compression failed.");
  }
  return blob;
}

/**
 * Compress large photos in the browser before POST /api/uploads.
 * Keeps files under typical platform body limits (e.g. Vercel ~4.5MB).
 * Canvas re-encode strips EXIF; callers should send `exif` alongside the file.
 */
export async function prepareFileForUpload(
  file: File,
  options?: {
    maxEdge?: number;
    targetBytes?: number;
  },
): Promise<PreparedUpload> {
  const maxEdge = options?.maxEdge ?? appConfig.uploadMaxEdge;
  const targetBytes = options?.targetBytes ?? appConfig.uploadTargetBytes;
  const exif = await readClientExif(file);

  if (isHeicLikeFile(file)) {
    return { file, exif, compressed: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeBitmap(file);
  } catch {
    return { file, exif, compressed: false };
  }

  try {
    const needsResize = Math.max(bitmap.width, bitmap.height) > maxEdge;
    const needsShrink = file.size > targetBytes;
    const forceJpeg =
      file.type === "image/png" ||
      file.type === "image/webp" ||
      /\.(png|webp|bmp|tiff?)$/i.test(file.name);

    if (!needsResize && !needsShrink && !forceJpeg) {
      return { file, exif, compressed: false };
    }

    const edgeSteps = [maxEdge, 2048, 1600, 1280];
    const qualitySteps = [0.85, 0.75, 0.65, 0.55];
    let best: { blob: Blob; width: number; height: number } | null = null;

    for (const edge of edgeSteps) {
      const size = scaledSize(bitmap.width, bitmap.height, edge);
      for (const quality of qualitySteps) {
        const blob = await canvasToJpegBlob(
          bitmap,
          size.width,
          size.height,
          quality,
        );
        if (!best || blob.size < best.blob.size) {
          best = { blob, width: size.width, height: size.height };
        }
        if (blob.size <= targetBytes) {
          return {
            file: new File([blob], jpegNameFromOriginal(file.name), {
              type: "image/jpeg",
              lastModified: file.lastModified,
            }),
            exif: {
              ...exif,
              // Orientation already baked into pixels.
              orientation: 1,
              width: size.width,
              height: size.height,
            },
            compressed: true,
          };
        }
      }
    }

    if (best && best.blob.size < file.size) {
      return {
        file: new File([best.blob], jpegNameFromOriginal(file.name), {
          type: "image/jpeg",
          lastModified: file.lastModified,
        }),
        exif: {
          ...exif,
          orientation: 1,
          width: best.width,
          height: best.height,
        },
        compressed: true,
      };
    }

    if (file.size <= targetBytes) {
      return { file, exif, compressed: false };
    }

    throw new Error("图片压缩后仍过大，请换成更小的照片再试。");
  } finally {
    bitmap.close();
  }
}

export function appendExifToFormData(form: FormData, exif: UploadExifMeta) {
  form.set("exifTakenAt", exif.takenAt ?? "");
  form.set("exifTakenAtSource", exif.takenAtSource);
  form.set("exifLatitude", exif.latitude == null ? "" : String(exif.latitude));
  form.set(
    "exifLongitude",
    exif.longitude == null ? "" : String(exif.longitude),
  );
  form.set(
    "exifOrientation",
    exif.orientation == null ? "" : String(exif.orientation),
  );
  form.set("exifCameraModel", exif.cameraModel ?? "");
  form.set("exifWidth", exif.width == null ? "" : String(exif.width));
  form.set("exifHeight", exif.height == null ? "" : String(exif.height));
}

export function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseUploadExifFromForm(form: FormData): UploadExifMeta | null {
  const sourceRaw = form.get("exifTakenAtSource");
  if (typeof sourceRaw !== "string") return null;
  if (sourceRaw !== "exif" && sourceRaw !== "file_mtime" && sourceRaw !== "none") {
    return null;
  }

  const takenAtRaw = form.get("exifTakenAt");
  const takenAt =
    typeof takenAtRaw === "string" && takenAtRaw.trim() !== ""
      ? takenAtRaw
      : null;

  return {
    takenAt,
    takenAtSource: sourceRaw,
    latitude: parseOptionalNumber(form.get("exifLatitude")),
    longitude: parseOptionalNumber(form.get("exifLongitude")),
    orientation: parseOptionalNumber(form.get("exifOrientation")),
    cameraModel: (() => {
      const v = form.get("exifCameraModel");
      return typeof v === "string" && v.trim() !== "" ? v : null;
    })(),
    width: parseOptionalNumber(form.get("exifWidth")),
    height: parseOptionalNumber(form.get("exifHeight")),
  };
}
