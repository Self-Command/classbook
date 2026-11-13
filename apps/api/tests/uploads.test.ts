import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { rm, stat } from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { AVATAR_MAX_BYTES } from '@classbook/shared';
import {
  app,
  createUser,
  loginAgent,
  resetDb,
} from './helpers';

const uploadDir = path.resolve(process.cwd(), 'uploads/test-tmp');

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lK3Q6wAAAABJRU5ErkJggg==',
  'base64',
);

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await rm(uploadDir, { recursive: true, force: true });
});

describe('上传', () => {
  it('登录用户可上传头像，静态文件同样要求登录且私有缓存', async () => {
    await createUser({ username: 'member' });
    const agent = await loginAgent('member');

    const response = await agent
      .post('/api/uploads/avatar')
      .attach('file', PNG_BYTES, { filename: 'avatar.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const filename = response.body.url.replace('/uploads/', '');
    const fileInfo = await stat(path.join(uploadDir, filename));
    expect(fileInfo.isFile()).toBe(true);

    const anonymous = await request(app).get(response.body.url);
    expect(anonymous.status).toBe(401);

    const authorized = await agent.get(response.body.url);
    expect(authorized.status).toBe(200);
    expect(authorized.headers['cache-control']).toContain('private');
  });

  it('不支持的 MIME 类型返回 UNSUPPORTED_FILE_TYPE', async () => {
    await createUser({ username: 'member' });
    const agent = await loginAgent('member');

    const response = await agent
      .post('/api/uploads/avatar')
      .attach('file', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('头像超过 2MB 返回 UPLOAD_TOO_LARGE', async () => {
    await createUser({ username: 'member' });
    const agent = await loginAgent('member');

    const response = await agent
      .post('/api/uploads/avatar')
      .attach('file', Buffer.alloc(AVATAR_MAX_BYTES + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('UPLOAD_TOO_LARGE');
  });

  it('未选择文件返回 VALIDATION_ERROR', async () => {
    await createUser({ username: 'member' });
    const agent = await loginAgent('member');

    const response = await agent.post('/api/uploads/avatar');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('普通成员可上传相册图片，且允许 2–5MB 的文件', async () => {
    await createUser({ username: 'member' });
    const memberAgent = await loginAgent('member');

    const memberResponse = await memberAgent
      .post('/api/uploads/images')
      .attach('file', PNG_BYTES, { filename: 'image.png', contentType: 'image/png' });
    expect(memberResponse.status).toBe(201);
    expect(memberResponse.body.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const largeResponse = await memberAgent
      .post('/api/uploads/images')
      .attach('file', Buffer.alloc(AVATAR_MAX_BYTES + 1024, 1), {
        filename: 'large.jpg',
        contentType: 'image/jpeg',
      });
    expect(largeResponse.status).toBe(201);
    expect(largeResponse.body.url).toMatch(/^\/uploads\/[0-9a-f-]+\.jpg$/);
  });
});
