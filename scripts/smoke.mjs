import assert from 'node:assert/strict';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const ADMIN_USERNAME = process.env.SMOKE_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('请通过 SMOKE_ADMIN_PASSWORD 环境变量提供冒烟测试管理员密码。');
  process.exit(1);
}

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=',
  'base64',
);

function createSession(label) {
  const cookies = new Map();

  async function request(path, options = {}) {
    const headers = new Headers(options.headers ?? {});
    if (cookies.size > 0) {
      headers.set(
        'cookie',
        [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; '),
      );
    }
    const isForm = options.body instanceof FormData;
    if (options.body !== undefined && !isForm && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    const response = await fetch(BASE + path, {
      ...options,
      headers,
      redirect: 'manual',
    });
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const pair = raw.split(';')[0];
      const index = pair.indexOf('=');
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === '' || /max-age=0/i.test(raw)) cookies.delete(key);
      else cookies.set(key, value);
    }
    return response;
  }

  async function json(path, options) {
    const response = await request(path, options);
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { response, body };
  }

  return { label, request, json };
}

const results = [];
function check(name, fn) {
  return async () => {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`  PASS  ${name}`);
    } catch (error) {
      results.push({ name, ok: false, error });
      console.log(`  FAIL  ${name}`);
      console.log(`        ${error.message}`);
    }
  };
}

const admin = createSession('admin');
const member = createSession('member');
const stamp = Date.now().toString(36);
const username = `smoke_${stamp}`;
const password = 'SmokeTest123';

let inviteCode;
let memberId;
let memberMessageId;
let adminUserId;
let albumId;
let photoUrl;
let avatarUrl;

const steps = [
  check('管理员登录', async () => {
    const { response, body } = await admin.json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    });
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.user.role, 'ADMIN');
    adminUserId = body.user.id;
  }),

  check('生成邀请码', async () => {
    const { response, body } = await admin.json('/api/admin/invite-codes', {
      method: 'POST',
      body: JSON.stringify({ note: `smoke-${stamp}`, maxUses: 1 }),
    });
    assert.equal(response.status, 201, JSON.stringify(body));
    inviteCode = body.invite.code;
    assert.match(inviteCode, /^[A-Z2-9]{8}$/);
  }),

  check('校验邀请码', async () => {
    const { response, body } = await member.json('/api/auth/invite/validate', {
      method: 'POST',
      body: JSON.stringify({ code: inviteCode }),
    });
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.valid, true);
  }),

  check('邀请码注册', async () => {
    const { response, body } = await member.json('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        inviteCode,
        username,
        password,
        realName: `测试${stamp}`,
      }),
    });
    assert.equal(response.status, 201, JSON.stringify(body));
    memberId = body.user.id;
    assert.equal(body.user.username, username);
  }),

  check('邀请码不可重复使用', async () => {
    const other = createSession('other');
    const { response } = await other.json('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        inviteCode,
        username: `${username}_2`,
        password,
        realName: '重复测试',
      }),
    });
    assert.equal(response.status, 400);
  }),

  check('未登录访问受保护接口返回 401', async () => {
    const anonymous = createSession('anonymous');
    const { response } = await anonymous.json('/api/profiles');
    assert.equal(response.status, 401);
  }),

  check('普通用户访问管理接口返回 403', async () => {
    const { response } = await member.json('/api/admin/stats');
    assert.equal(response.status, 403);
  }),

  check('更新并读取档案', async () => {
    const { response, body } = await member.json('/api/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify({
        nickname: `小${stamp.slice(-3)}`,
        motto: '青春不散场',
        bio: '这是冒烟测试写的一段简介。',
        wechat: `wx_${stamp}`,
        location: '测试城市',
      }),
    });
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.profile.motto, '青春不散场');

    const list = await member.json(`/api/profiles?q=${encodeURIComponent(`测试${stamp}`)}`);
    assert.equal(list.response.status, 200);
    assert.ok(
      list.body.items.some((item) => item.id === memberId),
      '搜索结果应包含新同学',
    );
  }),

  check('上传头像', async () => {
    const form = new FormData();
    form.append('file', new Blob([PNG_1PX], { type: 'image/png' }), 'avatar.png');
    const { response, body } = await member.json('/api/uploads/avatar', {
      method: 'POST',
      body: form,
    });
    assert.equal(response.status, 201, JSON.stringify(body));
    assert.match(body.url, /^\/uploads\//);
    avatarUrl = body.url;
  }),

  check('上传文件未登录不可访问', async () => {
    const anonymous = createSession('anonymous');
    const denied = await anonymous.request(avatarUrl);
    assert.equal(denied.status, 401);

    const allowed = await member.request(avatarUrl);
    assert.equal(allowed.status, 200);
  }),

  check('发布班级墙留言', async () => {
    const { response, body } = await member.json('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ content: `班级墙冒烟留言 ${stamp}` }),
    });
    assert.equal(response.status, 201, JSON.stringify(body));
    memberMessageId = body.message.id;

    const wall = await member.json('/api/messages');
    assert.equal(wall.response.status, 200);
    assert.ok(wall.body.items.some((item) => item.id === memberMessageId));
  }),

  check('发布个人留言板留言', async () => {
    const { response, body } = await member.json('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        content: `给管理员留言 ${stamp}`,
        toUserId: adminUserId,
      }),
    });
    assert.equal(response.status, 201, JSON.stringify(body));
    assert.equal(body.message.toUserId, adminUserId);

    const board = await member.json(`/api/messages?toUserId=${adminUserId}`);
    assert.ok(board.body.items.some((item) => item.id === body.message.id));

    const wall = await member.json('/api/messages');
    assert.ok(
      !wall.body.items.some((item) => item.id === body.message.id),
      '个人留言不应出现在班级墙',
    );
  }),

  check('管理员隐藏留言', async () => {
    const { response, body } = await admin.json(`/api/admin/messages/${memberMessageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'HIDDEN' }),
    });
    assert.equal(response.status, 200, JSON.stringify(body));

    const wall = await member.json('/api/messages');
    assert.ok(
      !wall.body.items.some((item) => item.id === memberMessageId),
      '隐藏后不应出现在前台',
    );

    const adminList = await admin.json('/api/admin/messages?status=HIDDEN');
    assert.ok(adminList.body.items.some((item) => item.id === memberMessageId));
  }),

  check('管理员创建相册并添加照片', async () => {
    const album = await admin.json('/api/admin/albums', {
      method: 'POST',
      body: JSON.stringify({ title: `冒烟相册 ${stamp}`, description: '集成测试' }),
    });
    assert.equal(album.response.status, 201, JSON.stringify(album.body));
    albumId = album.body.album.id;

    const form = new FormData();
    form.append('file', new Blob([PNG_1PX], { type: 'image/png' }), 'photo.png');
    const upload = await admin.json('/api/uploads/images', { method: 'POST', body: form });
    assert.equal(upload.response.status, 201, JSON.stringify(upload.body));
    photoUrl = upload.body.url;

    const attach = await admin.json(`/api/admin/albums/${albumId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ urls: [photoUrl], caption: '测试照片' }),
    });
    assert.equal(attach.response.status, 201, JSON.stringify(attach.body));

    const detail = await member.json(`/api/albums/${albumId}`);
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.album.photos.length, 1);
  }),

  check('管理员创建时间线事件', async () => {
    const { response, body } = await admin.json('/api/admin/timeline', {
      method: 'POST',
      body: JSON.stringify({
        date: new Date().toISOString(),
        title: `冒烟事件 ${stamp}`,
        description: '集成测试时间线',
      }),
    });
    assert.equal(response.status, 201, JSON.stringify(body));

    const list = await member.json('/api/timeline');
    assert.ok(list.body.items.some((item) => item.id === body.event.id));
  }),

  check('站点公开设置可匿名读取', async () => {
    const anonymous = createSession('anonymous');
    const { response, body } = await anonymous.json('/api/settings/public');
    assert.equal(response.status, 200);
    assert.ok(typeof body.className === 'string');
  }),

  check('站点封面图对访客可见，其余上传仍受保护', async () => {
    const set = await admin.json('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ heroImageUrl: photoUrl }),
    });
    assert.equal(set.response.status, 200, JSON.stringify(set.body));

    const anonymous = createSession('anonymous');
    const hero = await anonymous.request(photoUrl);
    assert.equal(hero.status, 200);

    const other = await anonymous.request(avatarUrl);
    assert.equal(other.status, 401);

    const reset = await admin.json('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ heroImageUrl: null }),
    });
    assert.equal(reset.response.status, 200);

    const hiddenAgain = await anonymous.request(photoUrl);
    assert.equal(hiddenAgain.status, 401);
  }),

  check('管理员统计', async () => {
    const { response, body } = await admin.json('/api/admin/stats');
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.ok(body.memberCount >= 2);
    assert.ok(body.photoCount >= 1);
  }),

  check('禁用成员后旧登录立即失效', async () => {
    const disable = await admin.json(`/api/admin/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'DISABLED' }),
    });
    assert.equal(disable.response.status, 200, JSON.stringify(disable.body));

    const me = await member.json('/api/auth/me');
    assert.equal(me.response.status, 401);
  }),
];

console.log(`\n冒烟测试 ${BASE}\n`);

for (const step of steps) {
  await step();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);

if (failed.length > 0) {
  process.exitCode = 1;
}
