import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DEFAULT_SITE_COPY, SITE_COPY_FIELDS, siteCopySchema } from '@classbook/shared';
import { prisma } from '../src/db';
import { app, createAdmin, loginAgent, resetDb } from './helpers';

describe('全站文案定义', () => {
  it('每个文案键都有非空默认值且不超过最大长度', () => {
    for (const field of SITE_COPY_FIELDS) {
      const value = DEFAULT_SITE_COPY[field.key];
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value.length).toBeLessThanOrEqual(field.max);
      const parsed = siteCopySchema.parse({ [field.key]: value });
      expect(parsed[field.key]).toBe(value);
    }
  });

  it('校验接受部分合法文案', () => {
    const parsed = siteCopySchema.parse({ siteName: '三年二班', navPlaza: '广场' });
    expect(parsed).toEqual({ siteName: '三年二班', navPlaza: '广场' });
  });

  it('校验拒绝超过最大长度的文案', () => {
    const field = SITE_COPY_FIELDS.find((item) => item.key === 'siteName');
    expect(field).toBeDefined();
    const result = siteCopySchema.safeParse({
      siteName: '拾'.repeat((field?.max ?? 0) + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe('全站文案设置接口', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('没有设置记录时公开接口返回全部默认文案', async () => {
    const response = await request(app).get('/api/settings/public');

    expect(response.status).toBe(200);
    expect(response.body.copy).toEqual(DEFAULT_SITE_COPY);
  });

  it('管理员只更新一个文案键，其余保持默认', async () => {
    await createAdmin();
    const agent = await loginAgent('admin');

    const response = await agent
      .patch('/api/admin/settings')
      .send({ copy: { siteName: '测试班级' } });

    expect(response.status).toBe(200);
    expect(response.body.copy).toEqual({ ...DEFAULT_SITE_COPY, siteName: '测试班级' });

    const publicSettings = await request(app).get('/api/settings/public');
    expect(publicSettings.status).toBe(200);
    expect(publicSettings.body.copy.siteName).toBe('测试班级');
    expect(publicSettings.body.copy.navPlaza).toBe(DEFAULT_SITE_COPY.navPlaza);
  });

  it('再次更新另一个文案键时与已有文案合并', async () => {
    await createAdmin();
    const agent = await loginAgent('admin');

    await agent.patch('/api/admin/settings').send({ copy: { siteName: '测试班级' } });
    const response = await agent
      .patch('/api/admin/settings')
      .send({ copy: { navPlaza: '广场' } });

    expect(response.status).toBe(200);
    expect(response.body.copy.siteName).toBe('测试班级');
    expect(response.body.copy.navPlaza).toBe('广场');

    const stored = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    expect(stored?.copy).toEqual({ siteName: '测试班级', navPlaza: '广场' });

    const publicSettings = await request(app).get('/api/settings/public');
    expect(publicSettings.body.copy.siteName).toBe('测试班级');
    expect(publicSettings.body.copy.navPlaza).toBe('广场');
  });

  it('超过最大长度的文案返回 400', async () => {
    await createAdmin();
    const agent = await loginAgent('admin');
    const field = SITE_COPY_FIELDS.find((item) => item.key === 'siteName');

    const response = await agent
      .patch('/api/admin/settings')
      .send({ copy: { siteName: '拾'.repeat((field?.max ?? 0) + 1) } });

    expect(response.status).toBe(400);
  });

  it('未知文案键被丢弃且不落库', async () => {
    await createAdmin();
    const agent = await loginAgent('admin');

    await agent.patch('/api/admin/settings').send({ copy: { siteName: '测试班级' } });
    const response = await agent
      .patch('/api/admin/settings')
      .send({ copy: { bogus: 'x' } });

    expect(response.status).toBe(200);
    expect(response.body.copy).not.toHaveProperty('bogus');
    expect(response.body.copy.siteName).toBe('测试班级');

    const stored = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    expect(stored?.copy).toEqual({ siteName: '测试班级' });
  });
});
