import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { config } from '../config';
import { ApiError } from '../lib/api-error';
import { requireAdmin, requireAuth } from '../lib/auth';
import { avatarUpload, extensionForMime, imageUpload } from '../lib/upload';

async function storeUploadedFile(file: Express.Multer.File): Promise<string> {
  const extension = extensionForMime(file.mimetype);
  if (!extension) {
    throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', '仅支持 JPG、PNG、WebP 格式的图片');
  }

  const filename = `${randomUUID()}.${extension}`;
  const directory = path.resolve(config.uploadDir);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), file.buffer);
  return `/uploads/${filename}`;
}

function requireUploadedFile(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) {
    throw new ApiError(400, 'VALIDATION_ERROR', '请选择要上传的文件');
  }
  return file;
}

export const uploadsRouter = Router();

uploadsRouter.post('/avatar', requireAuth, avatarUpload.single('file'), async (req, res) => {
  const file = requireUploadedFile(req.file);
  const url = await storeUploadedFile(file);
  res.status(201).json({ url });
});

uploadsRouter.post(
  '/images',
  requireAuth,
  requireAdmin,
  imageUpload.single('file'),
  async (req, res) => {
    const file = requireUploadedFile(req.file);
    const url = await storeUploadedFile(file);
    res.status(201).json({ url });
  },
);
