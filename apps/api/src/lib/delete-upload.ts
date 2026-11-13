import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';

const UPLOAD_URL_PREFIX = '/uploads/';

export async function deleteUploadFile(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return;

  const relative = url.slice(UPLOAD_URL_PREFIX.length);
  if (!relative || relative.includes('/') || relative.includes('\\')) return;

  const filename = path.basename(relative);
  const filePath = path.join(path.resolve(config.uploadDir), filename);

  try {
    await unlink(filePath);
  } catch {
    // 文件不存在或删除失败时不阻塞业务
  }
}
