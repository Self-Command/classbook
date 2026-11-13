import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db';
import {
  app,
  createInvite,
  createUser,
  getCookie,
  loginAgent,
  resetDb,
  TEST_PASSWORD,
} from './helpers';

beforeEach(async () => {
  await resetDb();
});

describe('邀请码与注册', () => {
  it('有效邀请码注册成功，写入用户与档案并递增 usedCount', async () => {
    const invite = await createInvite({ code: 'ABC23456', maxUses: 2 });

    const response = await request(app).post('/api/auth/register').send({
      inviteCode: 'ABC23456',
      username: 'alice',
      password: TEST_PASSWORD,
      realName: '爱丽丝',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.username).toBe('alice');
    expect(response.body.user.role).toBe('MEMBER');
    expect(response.body.user.profile.realName).toBe('爱丽丝');
    expect(response.body.user.passwordHash).toBeUndefined();

    const cookie = getCookie(response);
    expect(cookie).toContain('cb_token=');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=604800');

    const updatedInvite = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
    expect(updatedInvite?.usedCount).toBe(1);

    const user = await prisma.user.findUnique({ where: { username: 'alice' } });
    expect(user?.inviteCodeId).toBe(invite.id);
  });

  it('邀请码不存在、禁用、过期、用完时返回 INVALID_INVITE', async () => {
    await createInvite({ code: 'DISABLED', disabled: true });
    await createInvite({ code: 'EXPIRED2', expiresAt: new Date(Date.now() - 60_000) });
    await createInvite({ code: 'EXHAUST2', maxUses: 1, usedCount: 1 });

    for (const [index, code] of ['NOPE2345', 'DISABLED', 'EXPIRED2', 'EXHAUST2'].entries()) {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: code,
        username: `user${index}`,
        password: TEST_PASSWORD,
        realName: '测试同学',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INVITE');
    }

    const userCount = await prisma.user.count();
    expect(userCount).toBe(0);
  });

  it('用户名重复返回 USERNAME_TAKEN，且不消耗邀请码', async () => {
    await createUser({ username: 'bob', realName: '鲍勃' });
    const invite = await createInvite({ code: 'BCD34567' });

    const response = await request(app).post('/api/auth/register').send({
      inviteCode: 'BCD34567',
      username: 'bob',
      password: TEST_PASSWORD,
      realName: '另一个鲍勃',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('USERNAME_TAKEN');

    const updatedInvite = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
    expect(updatedInvite?.usedCount).toBe(0);
  });

  it('注册参数不合法返回 VALIDATION_ERROR 与 flatten details', async () => {
    const response = await request(app).post('/api/auth/register').send({
      inviteCode: 'ABC23456',
      username: 'a!',
      password: '123',
      realName: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fieldErrors).toBeTruthy();
  });

  it('invite/validate 有效返回 true，无效返回 false 且均为 200', async () => {
    await createInvite({ code: 'VALID234', maxUses: 1 });
    await createInvite({ code: 'USED2345', maxUses: 1, usedCount: 1 });

    const valid = await request(app).post('/api/auth/invite/validate').send({ code: 'VALID234' });
    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ valid: true });

    for (const code of ['NOPE2345', 'USED2345']) {
      const invalid = await request(app).post('/api/auth/invite/validate').send({ code });
      expect(invalid.status).toBe(200);
      expect(invalid.body).toEqual({ valid: false });
    }
  });
});

describe('登录与鉴权', () => {
  it('登录成功返回用户并下发 HttpOnly Cookie', async () => {
    await createUser({ username: 'carol', password: 'secret123', realName: '卡罗尔' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'carol', password: 'secret123' });

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe('carol');
    expect(response.body.user.profile.realName).toBe('卡罗尔');
    expect(getCookie(response)).toContain('cb_token=');
  });

  it('密码错误或用户不存在返回 INVALID_CREDENTIALS', async () => {
    await createUser({ username: 'dave', password: 'secret123' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dave', password: 'wrong-password' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');

    const missingUser = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'secret123' });
    expect(missingUser.status).toBe(401);
    expect(missingUser.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('禁用用户登录返回 USER_DISABLED', async () => {
    await createUser({ username: 'disabled', status: 'DISABLED' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'disabled', password: TEST_PASSWORD });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('USER_DISABLED');
  });

  it('未登录访问受保护接口返回 401，公开接口可访问', async () => {
    for (const path of [
      '/api/auth/me',
      '/api/profiles',
      '/api/messages',
      '/api/albums',
      '/api/timeline',
    ]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    }

    const settings = await request(app).get('/api/settings/public');
    expect(settings.status).toBe(200);
    expect(settings.body.className).toBe('我们的班级');

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ ok: true });
  });

  it('普通用户访问管理员接口返回 403 FORBIDDEN', async () => {
    await createUser({ username: 'member' });
    const agent = await loginAgent('member');

    const response = await agent.get('/api/admin/stats');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('退出登录清除 Cookie', async () => {
    await createUser({ username: 'erin' });
    const agent = await loginAgent('erin');

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('修改密码递增 tokenVersion，旧 Cookie 立即失效', async () => {
    const user = await createUser({ username: 'frank', password: 'oldpassword' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'frank', password: 'oldpassword' });
    const oldCookie = getCookie(login);

    const changed = await request(app)
      .patch('/api/auth/password')
      .set('Cookie', oldCookie)
      .send({ currentPassword: 'oldpassword', newPassword: 'newpassword' });
    expect(changed.status).toBe(204);

    const newCookie = getCookie(changed);
    expect(newCookie).not.toBe(oldCookie);

    const oldMe = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(oldMe.status).toBe(401);

    const newMe = await request(app).get('/api/auth/me').set('Cookie', newCookie);
    expect(newMe.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.tokenVersion).toBe(1);
  });

  it('修改密码时旧密码错误返回 INVALID_CREDENTIALS', async () => {
    await createUser({ username: 'grace', password: 'oldpassword' });
    const agent = await loginAgent('grace', 'oldpassword');

    const response = await agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'wrong-password', newPassword: 'newpassword' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('未知接口返回 404，非法 JSON 返回 VALIDATION_ERROR', async () => {
    const missing = await request(app).get('/api/not-exist');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const malformed = await request(app)
      .post('/api/auth/login')
      .type('json')
      .send('{"username":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });
});
