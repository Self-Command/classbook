import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { ALLOWED_IMAGE_MIME } from "@classbook/shared";
import { config } from "../config";
import { ApiError } from "../lib/api-error";
import { requireAuth } from "../lib/auth";
import { avatarUpload, extensionForMime, imageUpload, livePhotoUpload } from "../lib/upload";
import { extractMotionPhotoVideo } from "../lib/motion-photo";

async function storeBuffer(buffer: Buffer, extension: string): Promise<string> {
  const filename = `${randomUUID()}.${extension}`;
  const directory = path.resolve(config.uploadDir);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);
  return `/uploads/${filename}`;
}

async function storeUploadedFile(file: Express.Multer.File): Promise<string> {
  const extension = extensionForMime(file.mimetype);
  if (!extension) {
    throw new ApiError(415, "UNSUPPORTED_FILE_TYPE", "不支持的文件格式");
  }
  return storeBuffer(file.buffer, extension);
}

function requireUploadedFile(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) {
    throw new ApiError(400, "VALIDATION_ERROR", "请选择要上传的文件");
  }
  return file;
}

export const uploadsRouter = Router();

uploadsRouter.post("/avatar", requireAuth, avatarUpload.single("file"), async (req, res) => {
  const file = requireUploadedFile(req.file);
  const url = await storeUploadedFile(file);
  res.status(201).json({ url });
});

uploadsRouter.post(
  "/images",
  requireAuth,
  imageUpload.single("file"),
  async (req, res) => {
    const file = requireUploadedFile(req.file);
    const url = await storeUploadedFile(file);

    const motionVideo = extractMotionPhotoVideo(file.buffer);
    const videoUrl = motionVideo ? await storeBuffer(motionVideo, "mp4") : null;

    res.status(201).json({ url, videoUrl });
  },
);

uploadsRouter.post(
  "/live-photo",
  requireAuth,
  livePhotoUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const photo = files?.photo?.[0];
    const video = files?.video?.[0];

    if (!photo || !video) {
      throw new ApiError(400, "VALIDATION_ERROR", "实况照片需要同时上传图片和视频");
    }
    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(photo.mimetype)) {
      throw new ApiError(415, "UNSUPPORTED_FILE_TYPE", "仅支持 JPG、PNG、WebP 格式的图片");
    }
    if (!["video/mp4", "video/quicktime"].includes(video.mimetype)) {
      throw new ApiError(415, "UNSUPPORTED_FILE_TYPE", "视频仅支持 MP4 / MOV 格式");
    }

    const url = await storeUploadedFile(photo);
    const videoUrl = await storeUploadedFile(video);

    res.status(201).json({ url, videoUrl });
  },
);
