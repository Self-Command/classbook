import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db';
import { app, createUser, loginAgent, resetDb } from './helpers';

beforeEach(async () => {
  await resetDb();
});

describe('档案', () => {
  it('更新自己的档案，空字符串归一化为 null', async () => {
    const user = await createUser({ username: 'alice', realName: '爱丽丝' });
    const agent = await loginAgent('alice');

    const response = await agent.patch('/api/profiles/me').send({
      nickname: '小爱',
      motto: '',
      bio: '',
      wechat: 'wx-alice',
      qq: '',
      email: 'alice@example.com',
      phone: '',
      birthday: '05-20',
      location: '杭州',
    });

    expect(response.status).toBe(200);
    expect(response.body.profile.nickname).toBe('小爱');
    expect(response.body.profile.motto).toBeNull();
    expect(response.body.profile.bio).toBeNull();
    expect(response.body.profile.qq).toBeNull();
    expect(response.body.profile.phone).toBeNull();
    expect(response.body.profile.wechat).toBe('wx-alice');
    expect(response.body.profile.birthday).toBe('05-20');
    expect(response.body.profile.location).toBe('杭州');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.profile.nickname).toBe('小爱');
    expect(me.body.user.profile.motto).toBeNull();

    const stored = await prisma.profile.findUnique({ where: { userId: user.id } });
    expect(stored?.qq).toBeNull();
    expect(stored?.motto).toBeNull();
  });

  it('档案列表只返回 ACTIVE 成员，支持姓名/昵称搜索并按更新时间倒序', async () => {
    await createUser({ username: 'zhang', realName: '张小明', nickname: '小明' });
    await createUser({ username: 'li', realName: '李雷', nickname: '雷子' });
    await createUser({ username: 'wang', realName: '王五', status: 'DISABLED' });

    const agent = await loginAgent('zhang');

    const all = await agent.get('/api/profiles');
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(2);
    expect(all.body.items).toHaveLength(2);
    expect(all.body.items.map((item: { realName: string }) => item.realName)).not.toContain(
      '王五',
    );
    expect(all.body.items[0].id).toBeTruthy();
    expect(all.body.items[0].userId).toBeUndefined();

    const byName = await agent.get('/api/profiles').query({ q: '小明' });
    expect(byName.status).toBe(200);
    expect(byName.body.total).toBe(1);
    expect(byName.body.items[0].realName).toBe('张小明');

    const byNickname = await agent.get('/api/profiles').query({ q: '雷' });
    expect(byNickname.status).toBe(200);
    expect(byNickname.body.total).toBe(1);
    expect(byNickname.body.items[0].realName).toBe('李雷');
  });

  it('档案详情返回完整联系方式，禁用成员与不存在成员返回 404', async () => {
    const active = await createUser({ username: 'active', realName: '活跃同学' });
    const disabled = await createUser({
      username: 'inactive',
      realName: '禁用同学',
      status: 'DISABLED',
    });
    const viewer = await createUser({ username: 'viewer' });
    const agent = await loginAgent('viewer');

    await prisma.profile.update({
      where: { userId: active.id },
      data: { wechat: 'wx-1', email: 'a@example.com', phone: '13800000000' },
    });

    const response = await agent.get(`/api/profiles/${active.id}`);
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('active');
    expect(response.body.profile.userId).toBe(active.id);
    expect(response.body.profile.wechat).toBe('wx-1');
    expect(response.body.profile.email).toBe('a@example.com');

    const disabledResponse = await agent.get(`/api/profiles/${disabled.id}`);
    expect(disabledResponse.status).toBe(404);
    expect(disabledResponse.body.error.code).toBe('NOT_FOUND');

    const missingResponse = await agent.get('/api/profiles/not-exist');
    expect(missingResponse.status).toBe(404);

    expect(viewer.id).toBeTruthy();
  });

  it('分页默认 12 条，超过 50 返回 VALIDATION_ERROR', async () => {
    for (let i = 0; i < 14; i += 1) {
      await createUser({ username: `member${i}`, realName: `同学${i}` });
    }
    const agent = await loginAgent('member0');

    const firstPage = await agent.get('/api/profiles');
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.page).toBe(1);
    expect(firstPage.body.pageSize).toBe(12);
    expect(firstPage.body.items).toHaveLength(12);
    expect(firstPage.body.total).toBe(14);

    const secondPage = await agent.get('/api/profiles').query({ page: 2 });
    expect(secondPage.body.items).toHaveLength(2);

    const tooLarge = await agent.get('/api/profiles').query({ pageSize: 51 });
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body.error.code).toBe('VALIDATION_ERROR');
  });
});
