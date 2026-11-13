import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db';
import { app, createAdmin, createUser, loginAgent, resetDb } from './helpers';

beforeEach(async () => {
  await resetDb();
});

describe('相册', () => {
  it('管理员创建相册、添加照片，coverUrl 为空时回退第一张照片', async () => {
    await createAdmin();
    const adminAgent = await loginAgent('admin');

    const created = await adminAgent.post('/api/admin/albums').send({
      title: '毕业旅行',
      description: '海边的夏天',
    });
    expect(created.status).toBe(201);
    expect(created.body.album.title).toBe('毕业旅行');
    expect(created.body.album.photoCount).toBe(0);
    expect(created.body.album.coverUrl).toBeNull();

    const albumId = created.body.album.id;

    const photos = await adminAgent.post(`/api/admin/albums/${albumId}/photos`).send({
      urls: ['/uploads/a.jpg', '/uploads/b.jpg'],
      caption: '合影',
    });
    expect(photos.status).toBe(201);
    expect(photos.body.photos).toHaveLength(2);
    expect(photos.body.photos.map((photo: { sortOrder: number }) => photo.sortOrder)).toEqual([
      0, 1,
    ]);

    const morePhotos = await adminAgent.post(`/api/admin/albums/${albumId}/photos`).send({
      urls: ['/uploads/c.jpg'],
    });
    expect(morePhotos.body.photos[0].sortOrder).toBe(2);

    const list = await adminAgent.get('/api/albums');
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].photoCount).toBe(3);
    expect(list.body.items[0].coverUrl).toBe('/uploads/a.jpg');

    const detail = await adminAgent.get(`/api/albums/${albumId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.album.photos.map((photo: { url: string }) => photo.url)).toEqual([
      '/uploads/a.jpg',
      '/uploads/b.jpg',
      '/uploads/c.jpg',
    ]);
    expect(detail.body.album.photoCount).toBe(3);
  });

  it('管理员更新相册、删除照片与相册（级联照片）', async () => {
    await createAdmin();
    const adminAgent = await loginAgent('admin');

    const created = await adminAgent
      .post('/api/admin/albums')
      .send({ title: '旧标题', description: '旧描述' });
    const albumId = created.body.album.id;

    const photos = await adminAgent
      .post(`/api/admin/albums/${albumId}/photos`)
      .send({ urls: ['/uploads/x.jpg', '/uploads/y.jpg'] });
    const firstPhotoId = photos.body.photos[0].id;

    const updated = await adminAgent.patch(`/api/admin/albums/${albumId}`).send({
      title: '新标题',
      description: '新描述',
      coverUrl: '/uploads/cover.jpg',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.album.title).toBe('新标题');
    expect(updated.body.album.description).toBe('新描述');
    expect(updated.body.album.coverUrl).toBe('/uploads/cover.jpg');
    expect(updated.body.album.photoCount).toBe(2);

    const deletedPhoto = await adminAgent.delete(`/api/admin/photos/${firstPhotoId}`);
    expect(deletedPhoto.status).toBe(204);
    expect(await prisma.photo.count({ where: { albumId } })).toBe(1);

    const deletedAlbum = await adminAgent.delete(`/api/admin/albums/${albumId}`);
    expect(deletedAlbum.status).toBe(204);
    expect(await prisma.album.count()).toBe(0);
    expect(await prisma.photo.count()).toBe(0);

    const missing = await adminAgent.get(`/api/albums/${albumId}`);
    expect(missing.status).toBe(404);
  });

  it('普通用户不能创建相册或上传图片，但可以浏览相册', async () => {
    await createUser({ username: 'member' });
    const agent = await loginAgent('member');

    const createAlbum = await agent.post('/api/admin/albums').send({ title: '越权相册' });
    expect(createAlbum.status).toBe(403);

    const list = await agent.get('/api/albums');
    expect(list.status).toBe(200);
    expect(list.body.items).toEqual([]);
  });
});

describe('时间线', () => {
  it('管理员增删改时间线事件，列表按日期倒序', async () => {
    await createAdmin();
    const adminAgent = await loginAgent('admin');

    const first = await adminAgent.post('/api/admin/timeline').send({
      date: '2020-06-01T00:00:00.000Z',
      title: '入学',
      description: '第一次见面',
    });
    expect(first.status).toBe(201);

    const second = await adminAgent.post('/api/admin/timeline').send({
      date: '2023-06-20T00:00:00.000Z',
      title: '毕业',
      sortOrder: 2,
    });
    expect(second.status).toBe(201);

    const list = await adminAgent.get('/api/timeline');
    expect(list.status).toBe(200);
    expect(list.body.items.map((item: { title: string }) => item.title)).toEqual([
      '毕业',
      '入学',
    ]);

    const updated = await adminAgent.patch(`/api/admin/timeline/${first.body.event.id}`).send({
      title: '开学',
      imageUrl: '/uploads/timeline.jpg',
      description: '',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.event.title).toBe('开学');
    expect(updated.body.event.imageUrl).toBe('/uploads/timeline.jpg');
    expect(updated.body.event.description).toBeNull();

    const deleted = await adminAgent.delete(`/api/admin/timeline/${first.body.event.id}`);
    expect(deleted.status).toBe(204);

    const remaining = await adminAgent.get('/api/timeline');
    expect(remaining.body.items).toHaveLength(1);
    expect(remaining.body.items[0].title).toBe('毕业');

    const missing = await adminAgent.patch('/api/admin/timeline/not-exist').send({
      title: '不存在',
    });
    expect(missing.status).toBe(404);
  });

  it('普通用户不能创建时间线事件', async () => {
    await createUser({ username: 'member' });
    const agent = await loginAgent('member');

    const response = await agent
      .post('/api/admin/timeline')
      .send({ date: '2020-01-01', title: '越权' });

    expect(response.status).toBe(403);
  });
});
