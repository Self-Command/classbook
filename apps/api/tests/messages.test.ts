import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db';
import { app, createAdmin, createUser, loginAgent, resetDb } from './helpers';

beforeEach(async () => {
  await resetDb();
});

describe('留言', () => {
  it('发布班级墙与个人板留言，列表可分别筛选', async () => {
    await createUser({ username: 'alice', realName: '爱丽丝' });
    const bob = await createUser({ username: 'bob', realName: '鲍勃' });
    const aliceAgent = await loginAgent('alice');
    const bobAgent = await loginAgent('bob');

    const wallByAlice = await aliceAgent
      .post('/api/messages')
      .send({ content: '毕业快乐！' });
    expect(wallByAlice.status).toBe(201);
    expect(wallByAlice.body.message.toUserId).toBeNull();
    expect(wallByAlice.body.message.author.realName).toBe('爱丽丝');
    expect(wallByAlice.body.message.author.disabled).toBe(false);

    const wallByBob = await bobAgent.post('/api/messages').send({ content: '常联系' });
    expect(wallByBob.status).toBe(201);

    const toBob = await aliceAgent
      .post('/api/messages')
      .send({ content: '鲍勃你好', toUserId: bob.id });
    expect(toBob.status).toBe(201);
    expect(toBob.body.message.toUserId).toBe(bob.id);
    expect(toBob.body.message.toUser).toEqual({ id: bob.id, realName: '鲍勃' });

    const wall = await aliceAgent.get('/api/messages');
    expect(wall.status).toBe(200);
    expect(wall.body.total).toBe(2);
    expect(wall.body.items.every((item: { toUserId: string | null }) => item.toUserId === null)).toBe(
      true,
    );

    const personal = await bobAgent.get('/api/messages').query({ toUserId: bob.id });
    expect(personal.status).toBe(200);
    expect(personal.body.total).toBe(1);
    expect(personal.body.items[0].content).toBe('鲍勃你好');
  });

  it('个人板目标不存在或已禁用返回 404', async () => {
    await createUser({ username: 'alice' });
    const disabled = await createUser({ username: 'gone', status: 'DISABLED' });
    const agent = await loginAgent('alice');

    const missing = await agent
      .post('/api/messages')
      .send({ content: '你好', toUserId: 'not-exist' });
    expect(missing.status).toBe(404);

    const disabledTarget = await agent
      .post('/api/messages')
      .send({ content: '你好', toUserId: disabled.id });
    expect(disabledTarget.status).toBe(404);
  });

  it('隐藏留言不出现在前台，但仍出现在后台列表', async () => {
    await createAdmin();
    await createUser({ username: 'alice' });
    const aliceAgent = await loginAgent('alice');
    const adminAgent = await loginAgent('admin');

    const created = await aliceAgent.post('/api/messages').send({ content: '违规内容' });
    const messageId = created.body.message.id;

    const hidden = await adminAgent
      .patch(`/api/admin/messages/${messageId}`)
      .send({ status: 'HIDDEN' });
    expect(hidden.status).toBe(200);
    expect(hidden.body.message.status).toBe('HIDDEN');

    const publicList = await aliceAgent.get('/api/messages');
    expect(publicList.body.total).toBe(0);

    const adminVisible = await adminAgent.get('/api/admin/messages').query({ status: 'VISIBLE' });
    expect(adminVisible.body.total).toBe(0);

    const adminAll = await adminAgent.get('/api/admin/messages');
    expect(adminAll.body.total).toBe(1);
    expect(adminAll.body.items[0].status).toBe('HIDDEN');
  });

  it('作者被禁用后留言保留并按契约脱敏', async () => {
    const alice = await createUser({
      username: 'alice',
      realName: '爱丽丝',
      nickname: '小爱',
    });
    await createUser({ username: 'bob' });
    const aliceAgent = await loginAgent('alice');
    const bobAgent = await loginAgent('bob');

    await aliceAgent.post('/api/messages').send({ content: '留下的话' });
    await prisma.user.update({
      where: { id: alice.id },
      data: { status: 'DISABLED', tokenVersion: { increment: 1 } },
    });

    const response = await bobAgent.get('/api/messages');
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].content).toBe('留下的话');
    expect(response.body.items[0].author).toEqual({
      id: alice.id,
      realName: '已注销同学',
      nickname: null,
      avatarUrl: null,
      disabled: true,
    });
  });

  it('留言只能由作者或管理员删除', async () => {
    await createAdmin();
    await createUser({ username: 'alice' });
    await createUser({ username: 'bob' });
    const aliceAgent = await loginAgent('alice');
    const bobAgent = await loginAgent('bob');
    const adminAgent = await loginAgent('admin');

    const first = await aliceAgent.post('/api/messages').send({ content: '第一条' });
    const second = await bobAgent.post('/api/messages').send({ content: '第二条' });

    const forbidden = await bobAgent.delete(`/api/messages/${first.body.message.id}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    const ownDelete = await aliceAgent.delete(`/api/messages/${first.body.message.id}`);
    expect(ownDelete.status).toBe(204);

    const adminDelete = await adminAgent.delete(`/api/messages/${second.body.message.id}`);
    expect(adminDelete.status).toBe(204);

    expect(await prisma.message.count()).toBe(0);
  });

  it('空内容与超长内容返回 VALIDATION_ERROR', async () => {
    await createUser({ username: 'alice' });
    const agent = await loginAgent('alice');

    const empty = await agent.post('/api/messages').send({ content: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');

    const tooLong = await agent.post('/api/messages').send({ content: 'a'.repeat(501) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe('VALIDATION_ERROR');
  });
});
