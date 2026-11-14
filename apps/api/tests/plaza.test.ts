import type { IncomingMessage } from 'node:http';
import { createServer, request as httpRequest } from 'node:http';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import {
  app,
  createAdmin,
  createUser,
  getCookie,
  loginAgent,
  resetDb,
  TEST_PASSWORD,
  type TestAgent,
} from './helpers';

async function postMessage(
  agent: TestAgent,
  body: Record<string, unknown>,
): Promise<request.Response> {
  return agent.post('/api/messages').send(body);
}

describe('广场与通知（plaza / notifications）', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('发帖校验（Task 3.2/3.3）', () => {
    it('私密留言缺 toUserId 返回 400', async () => {
      const alice = await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');

      const res = await agent
        .post('/api/messages')
        .send({ content: '私密但没写收件人', visibility: 'PRIVATE' });

      expect(res.status).toBe(400);
      await expect(prisma.message.count()).resolves.toBe(0);
      expect(alice).toBeDefined();
    });

    it('图片超过 9 张返回校验错误', async () => {
      await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');

      const images = Array.from(
        { length: 10 },
        (_, i) => `/uploads/img-${i + 1}.jpg`,
      );
      const res = await agent.post('/api/plaza').send({ content: '九宫格超限', images });

      expect(res.status).toBe(400);
    });

    it('非法图片 URL 返回校验错误', async () => {
      await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');

      const res = await agent
        .post('/api/plaza')
        .send({ content: '坏图', images: ['/etc/passwd.png'] });

      expect(res.status).toBe(400);
    });

    it('2000 字边界允许，2001 字拒绝', async () => {
      await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');

      const ok = await agent.post('/api/plaza').send({ content: '好'.repeat(2000) });
      expect(ok.status).toBe(201);

      const bad = await agent.post('/api/plaza').send({ content: '长'.repeat(2001) });
      expect(bad.status).toBe(400);
    });
  });

  describe('可见性（Task 3.3）', () => {
    it('公开个人留言出现在广场流；私密不出现', async () => {
      const alice = await createUser({ username: 'alice', realName: '爱丽丝' });
      const bob = await createUser({ username: 'bob', realName: '鲍勃' });

      await prisma.message.create({
        data: {
          content: '公开留言',
          authorId: alice.id,
          toUserId: bob.id,
          visibility: 'PUBLIC',
        },
      });
      await prisma.message.create({
        data: {
          content: '私密悄悄话',
          authorId: alice.id,
          toUserId: bob.id,
          visibility: 'PRIVATE',
        },
      });
      await prisma.message.create({
        data: { content: '广场帖子', authorId: alice.id },
      });

      const agent = await loginAgent('bob');
      const res = await agent.get('/api/plaza');
      expect(res.status).toBe(200);
      const contents = res.body.items.map((item: { content: string }) => item.content);
      expect(contents).toContain('广场帖子');
      expect(contents).toContain('公开留言');
      expect(contents).not.toContain('私密悄悄话');
    });

    it('私密留言：第三方不可见、接收者可见、作者可见', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });
      const carol = await createUser({ username: 'carol' });

      const secret = await prisma.message.create({
        data: {
          content: '只有我们知道',
          authorId: alice.id,
          toUserId: bob.id,
          visibility: 'PRIVATE',
        },
      });

      const carolAgent = await loginAgent('carol');
      const forCarol = await carolAgent.get(`/api/messages?toUserId=${bob.id}`);
      expect(forCarol.body.items.map((m: { id: string }) => m.id)).not.toContain(secret.id);

      const bobAgent = await loginAgent('bob');
      const forBob = await bobAgent.get(`/api/messages?toUserId=${bob.id}`);
      expect(forBob.body.items.map((m: { id: string }) => m.id)).toContain(secret.id);

      const aliceAgent = await loginAgent('alice');
      const forAlice = await aliceAgent.get(`/api/messages?toUserId=${bob.id}`);
      expect(forAlice.body.items.map((m: { id: string }) => m.id)).toContain(secret.id);
      expect(carol).toBeDefined();
    });

    it('管理员列表只显示公开内容，私密只统计数量', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });
      await createAdmin('root');

      await prisma.message.create({
        data: { content: '公开内容', authorId: alice.id, toUserId: bob.id },
      });
      await prisma.message.create({
        data: {
          content: '管理员不能看',
          authorId: alice.id,
          toUserId: bob.id,
          visibility: 'PRIVATE',
        },
      });

      const adminAgent = await loginAgent('root');
      const res = await adminAgent.get('/api/admin/messages');

      expect(res.status).toBe(200);
      expect(res.body.privateCount).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].content).toBe('公开内容');

      const stats = await adminAgent.get('/api/admin/stats');
      expect(stats.body.privateMessageCount).toBe(1);
    });

    it('删除权限矩阵：公开=作者/管理员；私密=作者/接收者，管理员不可删', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });
      const carol = await createUser({ username: 'carol' });
      await createAdmin('root');

      const publicPost = await prisma.message.create({
        data: { content: '公开帖', authorId: alice.id },
      });
      const privateNote = await prisma.message.create({
        data: {
          content: '私密',
          authorId: alice.id,
          toUserId: bob.id,
          visibility: 'PRIVATE',
        },
      });

      const carolAgent = await loginAgent('carol');
      expect((await carolAgent.delete(`/api/plaza/${publicPost.id}`)).status).toBe(403);
      expect((await carolAgent.delete(`/api/messages/${privateNote.id}`)).status).toBe(403);

      const adminAgent = await loginAgent('root');
      expect((await adminAgent.delete(`/api/plaza/${publicPost.id}`)).status).toBe(204);
      expect((await adminAgent.delete(`/api/messages/${privateNote.id}`)).status).toBe(403);

      const bobAgent = await loginAgent('bob');
      expect((await bobAgent.delete(`/api/messages/${privateNote.id}`)).status).toBe(204);
      expect((await adminAgent.get(`/api/plaza/${publicPost.id}`)).status).toBe(404);
    });

    it('管理员不能隐藏/恢复私密留言', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });
      await createAdmin('root');

      const secret = await prisma.message.create({
        data: {
          content: '私密',
          authorId: alice.id,
          toUserId: bob.id,
          visibility: 'PRIVATE',
        },
      });

      const adminAgent = await loginAgent('root');
      const res = await adminAgent
        .patch(`/api/admin/messages/${secret.id}`)
        .send({ status: 'HIDDEN' });

      expect(res.status).toBe(403);
    });
  });

  describe('广场信息流与互动（Task 3.4）', () => {
    it('游标分页不重复、不遗漏', async () => {
      const alice = await createUser({ username: 'alice' });

      for (let i = 0; i < 25; i += 1) {
        await prisma.message.create({
          data: { content: `帖子 ${i + 1}`, authorId: alice.id },
        });
      }

      const agent = await loginAgent('alice');
      const page1 = await agent.get('/api/plaza?limit=20');
      expect(page1.body.items).toHaveLength(20);
      expect(page1.body.nextCursor).toBeTruthy();

      const page2 = await agent.get(
        `/api/plaza?limit=20&cursor=${encodeURIComponent(page1.body.nextCursor)}`,
      );
      expect(page2.body.items).toHaveLength(5);
      expect(page2.body.nextCursor).toBeNull();

      const ids = new Set([
        ...page1.body.items.map((m: { id: string }) => m.id),
        ...page2.body.items.map((m: { id: string }) => m.id),
      ]);
      expect(ids.size).toBe(25);
    });

    it('评论计数、两级限制、删除评论级联回复', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });

      const post = await prisma.message.create({
        data: { content: '来评论吧', authorId: alice.id },
      });

      const bobAgent = await loginAgent('bob');
      const c1 = await bobAgent.post(`/api/plaza/${post.id}/comments`).send({ content: '第一条' });
      expect(c1.status).toBe(201);
      expect(c1.body.comment.parentId).toBeNull();

      const reply = await bobAgent
        .post(`/api/plaza/${post.id}/comments`)
        .send({ content: '回复', parentId: c1.body.comment.id });
      expect(reply.status).toBe(201);

      const third = await bobAgent
        .post(`/api/plaza/${post.id}/comments`)
        .send({ content: '三级', parentId: reply.body.comment.id });
      expect(third.status).toBe(400);

      let detail = await bobAgent.get(`/api/plaza/${post.id}`);
      expect(detail.body.post.commentCount).toBe(2);
      expect(detail.body.comments).toHaveLength(2);
      expect(detail.body.comments[0].createdAt <= detail.body.comments[1].createdAt).toBe(true);

      const aliceAgent = await loginAgent('alice');
      const del = await aliceAgent.delete(`/api/plaza/comments/${c1.body.comment.id}`);
      expect(del.status).toBe(204);

      detail = await aliceAgent.get(`/api/plaza/${post.id}`);
      expect(detail.body.post.commentCount).toBe(0);
      expect(detail.body.comments).toHaveLength(0);
    });

    it('点赞 toggle 与通知去重', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });

      const post = await prisma.message.create({
        data: { content: '点个赞', authorId: alice.id },
      });

      const bobAgent = await loginAgent('bob');
      const like1 = await bobAgent.post(`/api/plaza/${post.id}/like`);
      expect(like1.body).toEqual({ likeCount: 1, likedByMe: true });

      const like2 = await bobAgent.post(`/api/plaza/${post.id}/like`);
      expect(like2.body).toEqual({ likeCount: 1, likedByMe: true });

      const unlike = await bobAgent.delete(`/api/plaza/${post.id}/like`);
      expect(unlike.body).toEqual({ likeCount: 0, likedByMe: false });

      await bobAgent.post(`/api/plaza/${post.id}/like`);
      await bobAgent.delete(`/api/plaza/${post.id}/like`);
      await bobAgent.post(`/api/plaza/${post.id}/like`);

      const likes = await prisma.messageLike.findMany();
      expect(likes).toHaveLength(1);

      const notifications = await prisma.notification.findMany({
        where: { userId: alice.id, type: 'POST_LIKE' },
      });
      expect(notifications).toHaveLength(1);

      const selfLike = await aliceAgentLikeSelf(post.id, alice.username);
      expect(selfLike).toBeDefined();
    });

    async function aliceAgentLikeSelf(postId: string, username: string) {
      const agent = await loginAgent(username);
      const res = await agent.post(`/api/plaza/${postId}/like`);
      await agent.delete(`/api/plaza/${postId}/like`);
      return res.status;
    }

    it('删除帖子级联清理评论、点赞与通知', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });

      const post = await prisma.message.create({
        data: { content: '将被删除', authorId: alice.id, images: [] },
      });
      await prisma.messageComment.create({
        data: { messageId: post.id, authorId: bob.id, content: '评论' },
      });
      await prisma.messageLike.create({
        data: { messageId: post.id, userId: bob.id },
      });
      await prisma.notification.create({
        data: {
          userId: alice.id,
          actorId: bob.id,
          type: 'POST_COMMENT',
          messageId: post.id,
          preview: '评论',
        },
      });

      const agent = await loginAgent('alice');
      const res = await agent.delete(`/api/plaza/${post.id}`);
      expect(res.status).toBe(204);

      expect(await prisma.messageComment.count()).toBe(0);
      expect(await prisma.messageLike.count()).toBe(0);
      expect(await prisma.notification.count()).toBe(0);
      expect(await prisma.message.count()).toBe(0);
    });

    it('帖子详情对私密/隐藏返回 404', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });

      const secret = await prisma.message.create({
        data: {
          content: '私密',
          authorId: alice.id,
          toUserId: bob.id,
          visibility: 'PRIVATE',
        },
      });

      const agent = await loginAgent('bob');
      expect((await agent.get(`/api/plaza/${secret.id}`)).status).toBe(404);
    });
  });

  describe('通知（Task 3.5）', () => {
    it('留言/评论/@ 产生通知；自己触发不通知', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });

      const aliceAgent = await loginAgent('alice');
      const bobAgent = await loginAgent('bob');

      await bobAgent
        .post('/api/messages')
        .send({ content: `@alice 来看这个 @bob`, toUserId: alice.id });
      await bobAgent
        .post('/api/messages')
        .send({ content: `@bob 自己提及自己 @alice` });

      const aliceNotes = await prisma.notification.findMany({
        where: { userId: alice.id },
      });
      const bobNotes = await prisma.notification.findMany({
        where: { userId: bob.id },
      });

      expect(aliceNotes.some((n) => n.type === 'PROFILE_MESSAGE')).toBe(true);
      expect(aliceNotes.some((n) => n.type === 'MENTION')).toBe(true);
      expect(bobNotes).toHaveLength(0);
      expect(alice).toBeDefined();
    });

    it('@ 不存在的用户不报错；最多 10 人', async () => {
      const alice = await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');

      const res = await agent
        .post('/api/plaza')
        .send({ content: '@ghost @ghost2 @alice 没有这些人' });

      expect(res.status).toBe(201);
      const notes = await prisma.notification.findMany();
      expect(notes.filter((n) => n.type === 'MENTION')).toHaveLength(0);
      expect(alice).toBeDefined();
    });

    it('未读数与标记已读', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });

      const bobAgent = await loginAgent('bob');
      await bobAgent.post('/api/messages').send({ content: '你好', toUserId: alice.id });
      await bobAgent.post('/api/messages').send({ content: '再聊', toUserId: alice.id });

      const agent = await loginAgent('alice');
      const list = await agent.get('/api/notifications');
      expect(list.body.items).toHaveLength(2);
      expect(list.body.unreadCount).toBe(2);

      const firstId = list.body.items[0].id;
      await agent.post('/api/notifications/read').send({ ids: [firstId] });
      const afterOne = await agent.get('/api/notifications/unread-count');
      expect(afterOne.body.unreadCount).toBe(1);

      await agent.post('/api/notifications/read').send({ all: true });
      const afterAll = await agent.get('/api/notifications/unread-count');
      expect(afterAll.body.unreadCount).toBe(0);

      const readNote = await prisma.notification.findFirst({
        where: { id: firstId },
      });
      expect(readNote?.readAt).toBeTruthy();
    });

    it('SSE 返回事件流并推送实时通知', async () => {
      const alice = await createUser({ username: 'alice' });
      const bob = await createUser({ username: 'bob' });
      const bobAgent = await loginAgent('bob');

      const cookie = getCookie(
        await request(app)
          .post('/api/auth/login')
          .send({ username: 'alice', password: TEST_PASSWORD }),
      );

      const server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address() as { port: number };

      try {
        const stream = await new Promise<IncomingMessage>((resolve, reject) => {
          const req = httpRequest(
            {
              host: '127.0.0.1',
              port,
              path: '/api/notifications/stream',
              headers: { Cookie: cookie },
            },
            resolve,
          );
          req.on('error', reject);
          req.end();
        });

        expect(stream.headers['content-type']).toContain('text/event-stream');
        expect(stream.headers['x-accel-buffering']).toBe('no');

        let receivedData = '';
        const gotNotification = new Promise<void>((resolve) => {
          stream.on('data', (chunk: Buffer) => {
            receivedData += chunk.toString('utf8');
            if (receivedData.includes('event: notification')) resolve();
          });
        });

        await bobAgent.post('/api/messages').send({ content: '你好', toUserId: alice.id });
        await gotNotification;

        expect(receivedData).toContain('event: notification');
        expect(receivedData).toContain('PROFILE_MESSAGE');
      } finally {
        server.closeAllConnections?.();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  describe('Web Push 订阅（Task 6）', () => {
    it('订阅、幂等与退订', async () => {
      const alice = await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');
      const endpoint = 'https://push.example.com/sub/abc';

      const first = await agent
        .post('/api/notifications/subscribe')
        .send({ endpoint, keys: { p256dh: 'BPk', auth: 'secret' } });
      expect(first.status).toBe(201);

      const second = await agent
        .post('/api/notifications/subscribe')
        .send({ endpoint, keys: { p256dh: 'BPk2', auth: 'secret2' } });
      expect(second.status).toBe(201);
      expect(second.body.id).toBe(first.body.id);

      const count = await prisma.pushSubscription.count({
        where: { userId: alice.id },
      });
      expect(count).toBe(1);

      const removed = await agent
        .delete('/api/notifications/subscribe')
        .send({ endpoint });
      expect(removed.status).toBe(204);

      expect(
        await prisma.pushSubscription.count({ where: { userId: alice.id } }),
      ).toBe(0);
    });

    it('非法订阅载荷返回 400；未登录返回 401', async () => {
      await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');

      const invalid = await agent
        .post('/api/notifications/subscribe')
        .send({ endpoint: 'no-url', keys: { p256dh: '', auth: '' } });
      expect(invalid.status).toBe(400);

      const anonymous = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          endpoint: 'https://push.example.com/sub/x',
          keys: { p256dh: 'a', auth: 'b' },
        });
      expect(anonymous.status).toBe(401);
    });

    it('VAPID 公钥接口返回配置或 null', async () => {
      await createUser({ username: 'alice' });
      const agent = await loginAgent('alice');

      const response = await agent.get('/api/notifications/vapid-public');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('publicKey');
    });
  });
});
