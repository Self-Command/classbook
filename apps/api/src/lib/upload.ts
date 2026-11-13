import multer from "multer";
import { ALLOWED_IMAGE_MIME, AVATAR_MAX_BYTES } from "@classbook/shared";
import { ApiError } from "./api-error";

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
): void {
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.mimetype)) {
    callback(new ApiError(415, "UNSUPPORTED_FILE_TYPE", "仅支持 JPG、PNG、WebP 格式的图片"));
    return;
  }
  callback(null, true);
}

export function extensionForMime(mime: string): string | null {
  return MIME_EXTENSION[mime] ?? null;
}

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: imageFileFilter,
});

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

export const livePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024, files: 2 },
});
