import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, createAdmin, createUser, loginAgent, resetDb } from './helpers';

beforeEach(async () => {
  await resetDb();
});

describe('主题偏好与站点默认主题', () => {
  it('公开设置默认 warm，管理员可以修改默认主题', async () => {
    const admin = await createAdmin();
    const agent = await loginAgent(admin.username);

    const initial = await request(app).get('/api/settings/public');
    expect(initial.status).toBe(200);
    expect(initial.body.defaultTheme).toBe('warm');

    const patched = await agent
      .patch('/api/admin/settings')
      .send({ defaultTheme: 'noir' });
    expect(patched.status).toBe(200);
    expect(patched.body.defaultTheme).toBe('noir');

    const after = await request(app).get('/api/settings/public');
    expect(after.body.defaultTheme).toBe('noir');
  });

  it('成员可以设置和清空自己的主题，非法值返回 400', async () => {
    const user = await createUser({ username: 'themeuser' });
    const agent = await loginAgent(user.username);

    const set = await agent.patch('/api/auth/preferences').send({ theme: 'marine' });
    expect(set.status).toBe(200);
    expect(set.body.user.theme).toBe('marine');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.theme).toBe('marine');

    const clear = await agent.patch('/api/auth/preferences').send({ theme: null });
    expect(clear.status).toBe(200);
    expect(clear.body.user.theme).toBeNull();

    const invalid = await agent.patch('/api/auth/preferences').send({ theme: 'nope' });
    expect(invalid.status).toBe(400);
  });

  it('普通成员不能修改站点默认主题', async () => {
    const user = await createUser({ username: 'thememember' });
    const agent = await loginAgent(user.username);

    const response = await agent.patch('/api/admin/settings').send({ defaultTheme: 'forest' });
    expect(response.status).toBe(403);
  });
});
