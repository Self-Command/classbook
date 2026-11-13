import { randomUUID } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { config } from '../src/config';
import { prisma } from '../src/db';
import { app, createUser, loginAgent, resetDb } from './helpers';

const uploadDir = path.resolve(config.uploadDir);

async function createTempUpload(extension: string): Promise<string> {
  await mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDir, filename), 'test');
  return `/uploads/${filename}`;
}

async function uploadExists(url: string): Promise<boolean> {
  try {
    await access(path.join(uploadDir, path.basename(url)));
    return true;
  } catch {
    return false;
  }
}

beforeEach(async () => {
  await resetDb();
});

describe('成员级相册 API', () => {
  it('普通成员可创建、修改、删除自己的相册', async () => {
    const alice = await createUser({ username: 'alice' });
    const agent = await loginAgent('alice');

    const created = await agent.post('/api/albums').send({
      title: '毕业旅行',
      description: '海边的夏天',
    });
    expect(created.status).toBe(201);
    expect(created.body.album.title).toBe('毕业旅行');
    expect(created.body.album.description).toBe('海边的夏天');
    expect(created.body.album.photoCount).toBe(0);

    const albumId = created.body.album.id;
    expect(await prisma.album.findUnique({ where: { id: albumId } })).toMatchObject({
      createdById: alice.id,
    });

    const updated = await agent.patch(`/api/albums/${albumId}`).send({
      title: '毕业旅行（二）',
      description: '',
      coverUrl: '/uploads/cover.jpg',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.album.title).toBe('毕业旅行（二）');
    expect(updated.body.album.description).toBeNull();
    expect(updated.body.album.coverUrl).toBe('/uploads/cover.jpg');

    const photos = await agent
      .post(`/api/albums/${albumId}/photos`)
      .send({ urls: ['/uploads/a.jpg', '/uploads/b.jpg'], caption: '合影' });
    expect(photos.status).toBe(201);
    expect(photos.body.photos).toHaveLength(2);
    expect(photos.body.photos.map((photo: { sortOrder: number }) => photo.sortOrder)).toEqual([
      0, 1,
    ]);

    const detail = await agent.get(`/api/albums/${albumId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.album.photoCount).toBe(2);
    expect(detail.body.album.photos[0].caption).toBe('合影');

    const deleted = await agent.delete(`/api/albums/${albumId}`);
    expect(deleted.status).toBe(204);
    expect(await prisma.album.count()).toBe(0);
    expect(await prisma.photo.count()).toBe(0);
  });

  it('其他成员可给任意相册添加照片并删除照片，同时清理图片和视频文件', async () => {
    await createUser({ username: 'alice' });
    await createUser({ username: 'bob' });
    const aliceAgent = await loginAgent('alice');
    const bobAgent = await loginAgent('bob');

    const created = await aliceAgent.post('/api/albums').send({ title: '运动会' });
    const albumId = created.body.album.id;

    const imageUrl = await createTempUpload('jpg');
    const videoUrl = await createTempUpload('mp4');
    expect(await uploadExists(imageUrl)).toBe(true);
    expect(await uploadExists(videoUrl)).toBe(true);

    const added = await bobAgent.post(`/api/albums/${albumId}/photos`).send({
      photos: [{ url: imageUrl, videoUrl }],
    });
    expect(added.status).toBe(201);
    expect(added.body.photos[0].url).toBe(imageUrl);
    expect(added.body.photos[0].videoUrl).toBe(videoUrl);

    const photoId = added.body.photos[0].id;
    const deleted = await bobAgent.delete(`/api/albums/photos/${photoId}`);
    expect(deleted.status).toBe(204);
    expect(await prisma.photo.count()).toBe(0);
    expect(await uploadExists(imageUrl)).toBe(false);
    expect(await uploadExists(videoUrl)).toBe(false);
  });

  it('其他成员可删除相册，并清理封面、照片和实况视频文件', async () => {
    await createUser({ username: 'alice' });
    await createUser({ username: 'bob' });
    const aliceAgent = await loginAgent('alice');
    const bobAgent = await loginAgent('bob');

    const coverUrl = await createTempUpload('jpg');
    const imageUrl = await createTempUpload('png');
    const videoUrl = await createTempUpload('mov');

    const created = await aliceAgent.post('/api/albums').send({ title: '班级相册' });
    expect(created.status).toBe(201);
    const albumId = created.body.album.id;

    const updated = await aliceAgent
      .patch(`/api/albums/${albumId}`)
      .send({ coverUrl });
    expect(updated.status).toBe(200);
    expect(updated.body.album.coverUrl).toBe(coverUrl);

    const added = await aliceAgent.post(`/api/albums/${albumId}/photos`).send({
      photos: [{ url: imageUrl, videoUrl }],
    });
    expect(added.status).toBe(201);

    const deleted = await bobAgent.delete(`/api/albums/${albumId}`);
    expect(deleted.status).toBe(204);
    expect(await prisma.album.count()).toBe(0);
    expect(await prisma.photo.count()).toBe(0);
    expect(await uploadExists(coverUrl)).toBe(false);
    expect(await uploadExists(imageUrl)).toBe(false);
    expect(await uploadExists(videoUrl)).toBe(false);
  });

  it('未登录不能操作相册', async () => {
    const album = await prisma.album.create({
      data: { title: '公开相册', createdById: (await createUser({ username: 'alice' })).id },
    });
    const photo = await prisma.photo.create({
      data: { albumId: album.id, url: '/uploads/a.jpg', sortOrder: 0 },
    });

    const anonymous = request(app);
    const responses = await Promise.all([
      anonymous.post('/api/albums').send({ title: '匿名相册' }),
      anonymous.patch(`/api/albums/${album.id}`).send({ title: '匿名修改' }),
      anonymous.delete(`/api/albums/${album.id}`),
      anonymous.post(`/api/albums/${album.id}/photos`).send({ urls: ['/uploads/b.jpg'] }),
      anonymous.delete(`/api/albums/photos/${photo.id}`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401]);
  });

  it('校验失败返回 400，资源不存在返回 404', async () => {
    await createUser({ username: 'alice' });
    const agent = await loginAgent('alice');

    const invalidCreate = await agent.post('/api/albums').send({ title: '   ' });
    expect(invalidCreate.status).toBe(400);

    const missingAlbum = await agent.patch('/api/albums/missing').send({ title: '不存在' });
    expect(missingAlbum.status).toBe(404);

    const missingAlbumPhotos = await agent
      .post('/api/albums/missing/photos')
      .send({ urls: ['/uploads/a.jpg'] });
    expect(missingAlbumPhotos.status).toBe(404);

    const missingPhoto = await agent.delete('/api/albums/photos/missing');
    expect(missingPhoto.status).toBe(404);
  });
});
