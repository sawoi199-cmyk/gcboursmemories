import { randomUUID } from "node:crypto";
import { isDriveConfigured, uploadDriveFile } from "@/lib/google-drive/gas-client";
import { parseImageExif, type ParsedExif } from "@/lib/exif/parse-exif";
import type { UploadExifMeta } from "@/lib/image/compress-for-upload";
import {
  createJpegThumbnail,
  isAcceptedImageMime,
  MAX_UPLOAD_BYTES,
} from "@/lib/image/thumbnail";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function mergeClientExif(
  fromFile: ParsedExif,
  client: UploadExifMeta | null | undefined,
): ParsedExif {
  if (!client) return fromFile;

  const clientTakenAt =
    client.takenAt && !Number.isNaN(Date.parse(client.takenAt))
      ? new Date(client.takenAt)
      : null;

  // Prefer client EXIF when present — canvas re-encode strips tags from the file.
  return {
    takenAt: clientTakenAt ?? fromFile.takenAt,
    takenAtSource: clientTakenAt
      ? client.takenAtSource
      : fromFile.takenAtSource,
    latitude: client.latitude ?? fromFile.latitude,
    longitude: client.longitude ?? fromFile.longitude,
    orientation: client.orientation ?? fromFile.orientation,
    cameraModel: client.cameraModel ?? fromFile.cameraModel,
    width: client.width ?? fromFile.width,
    height: client.height ?? fromFile.height,
  };
}

export type UploadedPhotoResult = {
  id: string;
  driveFileId: string;
  driveFolderId: string | null;
  thumbnailPath: string | null;
  originalFilename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  takenAt: string | null;
  takenAtSource: "exif" | "file_mtime" | "none";
  latitude: number | null;
  longitude: number | null;
  cameraModel: string | null;
  needsDateConfirm: boolean;
};

function extensionForMime(mimeType: string, filename: string) {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic") || mimeType.includes("heif")) return "heic";
  return "jpg";
}

export async function uploadPhotoForOwner(input: {
  ownerId: string;
  file: File;
  clientExif?: UploadExifMeta | null;
}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  if (!isDriveConfigured()) {
    throw new Error("GAS Drive gateway is not configured.");
  }

  const mimeType = input.file.type || "application/octet-stream";
  if (!isAcceptedImageMime(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }
  if (input.file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image exceeds 20MB limit.");
  }

  const arrayBuffer = await input.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileMtime = input.file.lastModified
    ? new Date(input.file.lastModified)
    : null;

  const exif = mergeClientExif(
    await parseImageExif(buffer, fileMtime),
    input.clientExif,
  );
  const thumbnail = await createJpegThumbnail({ buffer, mimeType });

  const ext = extensionForMime(mimeType, input.file.name);
  const driveName = `${input.ownerId}_${Date.now()}_${randomUUID()}.${ext}`;
  const drive = await uploadDriveFile({
    filename: driveName,
    mimeType,
    base64: buffer.toString("base64"),
    folder: "originals",
  });

  if (!drive.fileId) {
    throw new Error("GAS upload did not return fileId.");
  }

  const now = new Date();
  const thumbnailPath = `${input.ownerId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.jpg`;

  const supabase = createServiceClient();
  const { error: storageError } = await supabase.storage
    .from("memory-thumbnails")
    .upload(thumbnailPath, thumbnail.buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (storageError) {
    throw new Error(`Thumbnail upload failed: ${storageError.message}`);
  }

  const photoId = randomUUID();
  const { error: insertError } = await supabase.from("photos").insert({
    id: photoId,
    owner_id: input.ownerId,
    drive_file_id: drive.fileId,
    drive_folder_id: drive.folderId ?? null,
    thumbnail_path: thumbnailPath,
    original_filename: input.file.name,
    mime_type: mimeType,
    width: thumbnail.width ?? exif.width,
    height: thumbnail.height ?? exif.height,
    size_bytes: input.file.size,
    taken_at: exif.takenAt?.toISOString() ?? null,
    latitude: exif.latitude,
    longitude: exif.longitude,
    camera_model: exif.cameraModel,
    orientation: exif.orientation,
    alt_text: input.file.name,
  });

  if (insertError) {
    throw new Error(`Photo record failed: ${insertError.message}`);
  }

  return {
    id: photoId,
    driveFileId: drive.fileId,
    driveFolderId: drive.folderId ?? null,
    thumbnailPath,
    originalFilename: input.file.name,
    mimeType,
    width: thumbnail.width ?? exif.width,
    height: thumbnail.height ?? exif.height,
    sizeBytes: input.file.size,
    takenAt: exif.takenAt?.toISOString() ?? null,
    takenAtSource: exif.takenAtSource,
    latitude: exif.latitude,
    longitude: exif.longitude,
    cameraModel: exif.cameraModel,
    needsDateConfirm: exif.takenAtSource !== "exif",
  } satisfies UploadedPhotoResult;
}
