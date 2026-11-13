import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db';
import {
  app,
  createAdmin,
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

describe('管理后台', () => {
  it('统计接口只统计 ACTIVE 成员、全部留言与可用邀请码', async () => {
    const admin = await createAdmin();
    const member = await createUser({ username: 'member' });
    await createUser({ username: 'disabled', status: 'DISABLED' });

    const visible = await prisma.message.create({
      data: { authorId: member.id, content: '可见留言' },
    });
    await prisma.message.create({
      data: { authorId: member.id, content: '隐藏留言', status: 'HIDDEN' },
    });

    const album = await prisma.album.create({
      data: { title: '相册', createdById: admin.id },
    });
    await prisma.photo.create({
      data: { albumId: album.id, url: '/uploads/photo.jpg' },
    });

    await createInvite({ code: 'ACTIVE23', maxUses: 2 });
    await createInvite({ code: 'EXHAUST2', maxUses: 1, usedCount: 1 });
    await createInvite({ code: 'DISABLED', disabled: true });
    await createInvite({ code: 'EXPIRED2', expiresAt: new Date(Date.now() - 60_000) });

    const agent = await loginAgent('admin');
    const response = await agent.get('/api/admin/stats');

    expect(response.status).toBe(200);
    expect(response.body.memberCount).toBe(2);
    expect(response.body.messageCount).toBe(2);
    expect(response.body.hiddenMessageCount).toBe(1);
    expect(response.body.photoCount).toBe(1);
    expect(response.body.activeInviteCount).toBe(1);
    expect(response.body.recentMessages).toHaveLength(2);
    expect(
      response.body.recentMessages.map((message: { content: string }) => message.content).sort(),
    ).toEqual(['可见留言', '隐藏留言'].sort());
    expect(response.body.recentMessages.some((m: { id: string }) => m.id === visible.id)).toBe(
      true,
    );
  });

  it('成员列表支持搜索并返回留言数', async () => {
    const admin = await createAdmin();
    const member = await createUser({ username: 'zhangsan', realName: '张三', nickname: '小张' });
    await createUser({ username: 'lisi', realName: '李四' });
    await prisma.message.create({
      data: { authorId: member.id, content: '一条留言' },
    });
    expect(admin.id).toBeTruthy();

    const agent = await loginAgent('admin');

    const all = await agent.get('/api/admin/members');
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(3);

    const byRealName = await agent.get('/api/admin/members').query({ q: '张三' });
    expect(byRealName.body.total).toBe(1);
    expect(byRealName.body.items[0].username).toBe('zhangsan');
    expect(byRealName.body.items[0].messageCount).toBe(1);
    expect(byRealName.body.items[0].profile.realName).toBe('张三');

    const byUsername = await agent.get('/api/admin/members').query({ q: 'lisi' });
    expect(byUsername.body.total).toBe(1);

    const byNickname = await agent.get('/api/admin/members').query({ q: '小张' });
    expect(byNickname.body.total).toBe(1);
  });

  it('禁用成员递增 tokenVersion 并使旧 Cookie 失效', async () => {
    await createAdmin();
    const member = await createUser({ username: 'member' });
    const adminAgent = await loginAgent('admin');

    const memberLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'member', password: TEST_PASSWORD });
    const oldCookie = getCookie(memberLogin);

    const response = await adminAgent
      .patch(`/api/admin/members/${member.id}`)
      .send({ status: 'DISABLED' });

    expect(response.status).toBe(200);
    expect(response.body.member.status).toBe('DISABLED');

    const updated = await prisma.user.findUnique({ where: { id: member.id } });
    expect(updated?.tokenVersion).toBe(1);
    expect(updated?.status).toBe('DISABLED');

    const oldMe = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(oldMe.status).toBe(401);
  });

  it('变更角色也会递增 tokenVersion', async () => {
    await createAdmin();
    const member = await createUser({ username: 'member' });
    const adminAgent = await loginAgent('admin');

    const response = await adminAgent
      .patch(`/api/admin/members/${member.id}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(200);
    expect(response.body.member.role).toBe('ADMIN');
    expect(response.body.member.tokenVersion).toBeUndefined();

    const updated = await prisma.user.findUnique({ where: { id: member.id } });
    expect(updated?.tokenVersion).toBe(1);
  });

  it('管理员不能禁用自己或重置自己的密码', async () => {
    const admin = await createAdmin();
    const agent = await loginAgent('admin');

    const selfPatch = await agent
      .patch(`/api/admin/members/${admin.id}`)
      .send({ status: 'DISABLED' });
    expect(selfPatch.status).toBe(400);
    expect(selfPatch.body.error.code).toBe('CANNOT_MODIFY_SELF');

    const selfReset = await agent
      .post(`/api/admin/members/${admin.id}/reset-password`)
      .send({ newPassword: 'newpassword' });
    expect(selfReset.status).toBe(400);
    expect(selfReset.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  it('管理员重置密码后旧 Cookie 失效，新密码可登录', async () => {
    await createAdmin();
    const member = await createUser({ username: 'member' });
    const adminAgent = await loginAgent('admin');

    const memberLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'member', password: TEST_PASSWORD });
    const oldCookie = getCookie(memberLogin);

    const reset = await adminAgent
      .post(`/api/admin/members/${member.id}/reset-password`)
      .send({ newPassword: 'resetpass123' });
    expect(reset.status).toBe(204);

    const oldMe = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(oldMe.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'member', password: 'resetpass123' });
    expect(newLogin.status).toBe(200);
  });

  it('生成 8 位邀请码，格式合法且可停用', async () => {
    await createAdmin();
    const agent = await loginAgent('admin');

    const response = await agent.post('/api/admin/invite-codes').send({
      note: '给新同学',
      maxUses: 5,
      expiresAt: '2027-01-01T00:00:00.000Z',
    });

    expect(response.status).toBe(201);
    expect(response.body.invite.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(response.body.invite.maxUses).toBe(5);
    expect(response.body.invite.usedCount).toBe(0);
    expect(response.body.invite.disabled).toBe(false);
    expect(response.body.invite.note).toBe('给新同学');

    const list = await agent.get('/api/admin/invite-codes');
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);

    const disabled = await agent.delete(`/api/admin/invite-codes/${response.body.invite.id}`);
    expect(disabled.status).toBe(204);

    const stored = await prisma.inviteCode.findUnique({
      where: { id: response.body.invite.id },
    });
    expect(stored?.disabled).toBe(true);

    const validate = await request(app)
      .post('/api/auth/invite/validate')
      .send({ code: response.body.invite.code });
    expect(validate.body.valid).toBe(false);
  });

  it('管理员更新站点设置，公开接口同步生效', async () => {
    await createAdmin();
    await createUser({ username: 'member' });
    const adminAgent = await loginAgent('admin');
    const memberAgent = await loginAgent('member');

    const forbidden = await memberAgent
      .patch('/api/admin/settings')
      .send({ className: '越权班级' });
    expect(forbidden.status).toBe(403);

    const updated = await adminAgent.patch('/api/admin/settings').send({
      className: '拾光三班',
      schoolName: '第一中学',
      graduationYear: 2026,
      slogan: '青春不散场',
      heroImageUrl: '/uploads/hero.jpg',
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({
      className: '拾光三班',
      schoolName: '第一中学',
      graduationYear: 2026,
      slogan: '青春不散场',
      heroImageUrl: '/uploads/hero.jpg',
      defaultTheme: 'warm',
      imageCompressEnabled: true,
      imageCompressThresholdKb: 1024,
      imageMaxDimension: 1920,
      imageQuality: 82,
    });

    const publicSettings = await request(app).get('/api/settings/public');
    expect(publicSettings.status).toBe(200);
    expect(publicSettings.body.className).toBe('拾光三班');
    expect(publicSettings.body.graduationYear).toBe(2026);
  });

  it('邀请码用尽后不能再次注册', async () => {
    await createAdmin();
    const agent = await loginAgent('admin');

    const created = await agent.post('/api/admin/invite-codes').send({ maxUses: 1 });
    const code = created.body.invite.code;

    const first = await request(app).post('/api/auth/register').send({
      inviteCode: code,
      username: 'first',
      password: TEST_PASSWORD,
      realName: '第一位',
    });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/auth/register').send({
      inviteCode: code,
      username: 'second',
      password: TEST_PASSWORD,
      realName: '第二位',
    });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('INVALID_INVITE');

    const stored = await prisma.inviteCode.findUnique({
      where: { id: created.body.invite.id },
    });
    expect(stored?.usedCount).toBe(1);
  });
});
