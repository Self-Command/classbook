import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

/**
 * 仅用于演示/截图的种子脚本：生成完全虚构的班级数据。
 * 会清空除管理员外的业务数据，必须显式确认后运行。
 */
const prisma = new PrismaClient();
const API = process.env.DEMO_API_URL ?? 'http://127.0.0.1:3000';
const IMAGE_DIR = path.resolve(
  process.env.DEMO_IMAGE_DIR ?? path.join(process.cwd(), 'prisma/demo-images'),
);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'demo_admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MEMBER_PASSWORD = process.env.DEMO_MEMBER_PASSWORD ?? 'Demo-Member-2026!';

if (process.env.CONFIRM_DEMO_SEED !== 'yes') {
  console.error('这会清空演示库内容。确认请设置 CONFIRM_DEMO_SEED=yes 后重跑。');
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  throw new Error('请通过 ADMIN_PASSWORD 提供演示管理员密码。');
}
const adminPassword: string = ADMIN_PASSWORD;

async function login(): Promise<string> {
  const response = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: adminPassword }),
  });
  if (!response.ok) {
    throw new Error(`演示管理员登录失败：${response.status} ${await response.text()}`);
  }
  const raw = response.headers.get('set-cookie');
  const cookie = raw?.split(';')[0];
  if (!cookie) throw new Error('登录响应缺少 Cookie');
  return cookie;
}

async function upload(cookie: string, file: string, endpoint: 'avatar' | 'images'): Promise<string> {
  const bytes = new Uint8Array(await readFile(path.join(IMAGE_DIR, file)));
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'image/jpeg' }), file);
  const response = await fetch(`${API}/api/uploads/${endpoint}`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`上传 ${file} 失败：${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { url: string };
  return data.url;
}

function date(value: string): Date {
  return new Date(value);
}

async function main(): Promise<void> {
  const cookie = await login();

  const imageFiles = [
    'avatar-admin.jpg',
    'avatar-su.jpg',
    'avatar-zhou.jpg',
    'avatar-jiang.jpg',
    'avatar-shen.jpg',
    'avatar-gu.jpg',
    'avatar-tang.jpg',
    'avatar-xu.jpg',
    'avatar-lu.jpg',
    'avatar-wen.jpg',
    'hero.jpg',
    'photo-dawn.jpg',
    'photo-sea.jpg',
    'photo-pine.jpg',
    'photo-night.jpg',
    'photo-window.jpg',
    'photo-track.jpg',
    'photo-campus.jpg',
    'photo-flowers.jpg',
    'photo-books.jpg',
    'photo-rain.jpg',
    'photo-confetti.jpg',
  ] as const;

  const images: Record<string, string> = {};
  for (const file of imageFiles) {
    const endpoint = file.startsWith('avatar-') ? 'avatar' : 'images';
    images[file] = await upload(cookie, file, endpoint);
    console.log(`上传 ${file} → ${images[file]}`);
  }

  const passwordHash = await bcrypt.hash(MEMBER_PASSWORD, 10);
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.message.deleteMany();
    await tx.photo.deleteMany();
    await tx.album.deleteMany();
    await tx.timelineEvent.deleteMany();
    await tx.user.deleteMany({ where: { role: 'MEMBER' } });
    await tx.inviteCode.deleteMany();

    const admin = await tx.user.upsert({
      where: { username: ADMIN_USERNAME },
      update: {
        passwordHash: adminHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        theme: 'warm',
      },
      create: {
        username: ADMIN_USERNAME,
        passwordHash: adminHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        theme: 'warm',
      },
    });
    await tx.profile.upsert({
      where: { userId: admin.id },
      update: {
        realName: '林见夏',
        nickname: '夏夏',
        avatarUrl: images['avatar-admin.jpg'],
        motto: '把日子过成喜欢的样子',
        bio: '假装是班长，负责把大家的故事收进这本同学录。',
        location: '云川 · 南城',
        birthday: '06-15',
        email: 'demo.admin@example.com',
        phone: '138-0000-0000',
        wechat: 'demo_admin',
        qq: '100000000',
      },
      create: {
        userId: admin.id,
        realName: '林见夏',
        nickname: '夏夏',
        avatarUrl: images['avatar-admin.jpg'],
        motto: '把日子过成喜欢的样子',
        bio: '假装是班长，负责把大家的故事收进这本同学录。',
        location: '云川 · 南城',
        birthday: '06-15',
        email: 'demo.admin@example.com',
        phone: '138-0000-0000',
        wechat: 'demo_admin',
        qq: '100000000',
      },
    });

    const invite = await tx.inviteCode.create({
      data: {
        id: 'demo-invite-grad',
        code: 'GRAD2027',
        note: '毕业季补录',
        maxUses: 20,
        usedCount: 7,
        expiresAt: date('2027-12-31T23:59:59+08:00'),
        createdById: admin.id,
        createdAt: date('2026-05-01T10:00:00+08:00'),
      },
    });
    await tx.inviteCode.createMany({
      data: [
        {
          id: 'demo-invite-reunion',
          code: 'REUNION',
          note: '十年之约',
          maxUses: 50,
          usedCount: 0,
          createdById: admin.id,
          createdAt: date('2026-06-01T10:00:00+08:00'),
        },
        {
          id: 'demo-invite-old',
          code: 'OLD2026',
          note: '已停用的旧邀请码',
          maxUses: 1,
          usedCount: 1,
          disabled: true,
          expiresAt: date('2026-01-01T00:00:00+08:00'),
          createdById: admin.id,
          createdAt: date('2025-09-01T10:00:00+08:00'),
        },
      ],
    });

    const memberSpecs = [
      {
        id: 'demo-member-01',
        username: 'demo_su',
        realName: '苏晚晴',
        nickname: '晚晚',
        avatar: 'avatar-su.jpg',
        motto: '慢慢来，比较快。',
        bio: '喜欢拍照和记录天空，毕业后想去看一次海。',
        location: '云川 · 北岸',
        birthday: '03-22',
        email: 'demo.su@example.com',
        phone: '138-0000-0001',
        wechat: 'demo_su',
        qq: '100000001',
      },
      {
        id: 'demo-member-02',
        username: 'demo_zhou',
        realName: '周予安',
        nickname: '小舟',
        avatar: 'avatar-zhou.jpg',
        motto: '风会记得每一朵花。',
        bio: '班里的植物养护员，窗台上那盆绿萝还活着。',
        location: '云川 · 南城',
        birthday: '07-09',
        email: 'demo.zhou@example.com',
        phone: '138-0000-0002',
        wechat: 'demo_zhou',
        qq: '100000002',
      },
      {
        id: 'demo-member-03',
        username: 'demo_jiang',
        realName: '江屿',
        nickname: '阿屿',
        avatar: 'avatar-jiang.jpg',
        motto: '保持热爱，奔赴山海。',
        bio: '篮球场常驻，偶尔写一点没人看的诗。',
        location: '云川 · 东港',
        birthday: '11-02',
        email: 'demo.jiang@example.com',
        phone: '138-0000-0003',
        wechat: 'demo_jiang',
        qq: '100000003',
      },
      {
        id: 'demo-member-04',
        username: 'demo_shen',
        realName: '沈知遥',
        nickname: '遥遥',
        avatar: 'avatar-shen.jpg',
        motto: '把普通的日子过得浪漫一点。',
        bio: '喜欢画画和旧电影，正在练习把生活调成暖色。',
        location: '云川 · 西岭',
        birthday: '09-18',
        email: 'demo.shen@example.com',
        phone: '138-0000-0004',
        wechat: 'demo_shen',
        qq: '100000004',
      },
      {
        id: 'demo-member-05',
        username: 'demo_gu',
        realName: '顾南星',
        nickname: '南星',
        avatar: 'avatar-gu.jpg',
        motto: '山高路远，来日方长。',
        bio: '广播站前成员，负责在晚自习前放最后一首歌。',
        location: '云川 · 南城',
        birthday: '01-30',
        email: 'demo.gu@example.com',
        phone: '138-0000-0005',
        wechat: 'demo_gu',
        qq: '100000005',
      },
      {
        id: 'demo-member-06',
        username: 'demo_tang',
        realName: '唐果',
        nickname: '果果',
        avatar: 'avatar-tang.jpg',
        motto: '今天也要好好吃饭。',
        bio: '食堂测评博主，梦想是吃遍学校周边所有小店。',
        location: '云川 · 北岸',
        birthday: '05-06',
        email: 'demo.tang@example.com',
        phone: '138-0000-0006',
        wechat: 'demo_tang',
        qq: '100000006',
      },
      {
        id: 'demo-member-07',
        username: 'demo_xu',
        realName: '许听澜',
        nickname: '澜澜',
        avatar: 'avatar-xu.jpg',
        motto: '安静地努力，响亮地生活。',
        bio: '图书馆靠窗座位的长期占有人，喜欢散文和热牛奶。',
        location: '云川 · 西岭',
        birthday: '10-12',
        email: 'demo.xu@example.com',
        phone: '138-0000-0007',
        wechat: 'demo_xu',
        qq: '100000007',
      },
      {
        id: 'demo-member-08',
        username: 'demo_lu',
        realName: '陆星野',
        nickname: '星野',
        avatar: 'avatar-lu.jpg',
        motto: '去更远的地方，看更亮的星星。',
        bio: '天文社成员，晚自习后喜欢在操场看星星。',
        location: '云川 · 东港',
        birthday: '12-24',
        email: 'demo.lu@example.com',
        phone: '138-0000-0008',
        wechat: 'demo_lu',
        qq: '100000008',
      },
      {
        id: 'demo-member-09',
        username: 'demo_wen',
        realName: '温以宁',
        nickname: '以宁',
        avatar: 'avatar-wen.jpg',
        motto: '愿我们都能成为温柔而有力量的人。',
        bio: '班级心理委员，擅长倾听，也擅长把大家逗笑。',
        location: '云川 · 南城',
        birthday: '04-03',
        email: 'demo.wen@example.com',
        phone: '138-0000-0009',
        wechat: 'demo_wen',
        qq: '100000009',
      },
    ];

    const members: { id: string; username: string }[] = [];
    for (const [index, spec] of memberSpecs.entries()) {
      const member = await tx.user.create({
        data: {
          id: spec.id,
          username: spec.username,
          passwordHash,
          role: 'MEMBER',
          status: 'ACTIVE',
          theme: index === 1 ? 'forest' : 'warm',
          inviteCodeId: invite.id,
          createdAt: date(`2026-0${(index % 6) + 1}-${String(8 + index).padStart(2, '0')}T10:00:00+08:00`),
          profile: {
            create: {
              realName: spec.realName,
              nickname: spec.nickname,
              avatarUrl: images[spec.avatar],
              motto: spec.motto,
              bio: spec.bio,
              location: spec.location,
              birthday: spec.birthday,
              email: spec.email,
              phone: spec.phone,
              wechat: spec.wechat,
              qq: spec.qq,
            },
          },
        },
      });
      members.push({ id: member.id, username: member.username });
    }

    const albums = [
      {
        id: 'demo-album-graduation',
        title: '毕业季 · 夏日留影',
        description: '把最后一个月的光，留在这些画面里。',
        createdById: admin.id,
        createdAt: date('2026-06-20T16:00:00+08:00'),
        photos: [
          ['photo-dawn.jpg', '清晨六点的操场，天刚刚亮。'],
          ['photo-sea.jpg', '毕业旅行看到的海。'],
          ['photo-flowers.jpg', '校门口那片开得正好的花。'],
          ['photo-confetti.jpg', '毕业晚会散场前。'],
          ['photo-campus.jpg', '最后一次走过教学楼。'],
          ['photo-night.jpg', '宿舍楼顶的星空。'],
        ],
      },
      {
        id: 'demo-album-sports',
        title: '操场上的风',
        description: '运动会、晚跑，还有永远吹不完的风。',
        createdById: members[2].id,
        createdAt: date('2026-04-18T09:00:00+08:00'),
        photos: [
          ['photo-track.jpg', '接力赛最后一棒。'],
          ['photo-pine.jpg', '跑道尽头的小树林。'],
          ['photo-rain.jpg', '下雨也照常训练的下午。'],
          ['photo-campus.jpg', '运动会结束后的天空。'],
        ],
      },
      {
        id: 'demo-album-classroom',
        title: '教室里的光',
        description: '窗边、书堆、晚自习，和偷偷传过的纸条。',
        createdById: members[3].id,
        createdAt: date('2026-03-12T18:00:00+08:00'),
        photos: [
          ['photo-window.jpg', '下午四点的窗。'],
          ['photo-books.jpg', '桌角那摞永远看不完的书。'],
          ['photo-window.jpg', '夕阳落在最后一排。'],
        ],
      },
    ];

    for (const album of albums) {
      await tx.album.create({
        data: {
          id: album.id,
          title: album.title,
          description: album.description,
          coverUrl: images[album.photos[0][0]],
          createdById: album.createdById,
          createdAt: album.createdAt,
          photos: {
            create: album.photos.map(([file, caption], index) => ({
              url: images[file],
              caption,
              sortOrder: index,
              createdAt: album.createdAt,
            })),
          },
        },
      });
    }

    const timeline = [
      {
        id: 'demo-event-01',
        date: date('2023-09-01T08:00:00+08:00'),
        title: '开学第一天',
        description: '在陌生的教室里写下自己的名字，故事从这里开始。',
        imageUrl: images['photo-campus.jpg'],
        sortOrder: 1,
      },
      {
        id: 'demo-event-02',
        date: date('2024-04-12T09:30:00+08:00'),
        title: '第一次春游',
        description: '坐了很远的车，看了很大的山，回来时全班都睡着了。',
        imageUrl: images['photo-pine.jpg'],
        sortOrder: 2,
      },
      {
        id: 'demo-event-03',
        date: date('2024-11-08T14:00:00+08:00'),
        title: '运动会',
        description: '接力赛拿了第二名，但大家都觉得那天赢了很多。',
        imageUrl: images['photo-track.jpg'],
        sortOrder: 3,
      },
      {
        id: 'demo-event-04',
        date: date('2025-06-18T19:00:00+08:00'),
        title: '成人礼',
        description: '换上正装，认真地和少年时代道别。',
        imageUrl: images['photo-confetti.jpg'],
        sortOrder: 4,
      },
      {
        id: 'demo-event-05',
        date: date('2026-05-20T16:30:00+08:00'),
        title: '毕业照',
        description: '快门按下的那一刻，谁都没有眨眼。',
        imageUrl: images['photo-dawn.jpg'],
        sortOrder: 5,
      },
      {
        id: 'demo-event-06',
        date: date('2026-06-30T21:30:00+08:00'),
        title: '最后一节晚自习',
        description: '灯熄得很慢，谁也舍不得先走。',
        imageUrl: images['photo-window.jpg'],
        sortOrder: 6,
      },
    ];
    for (const event of timeline) {
      await tx.timelineEvent.create({
        data: { ...event, createdById: admin.id },
      });
    }

    const messages = [
      ['demo-msg-01', members[0].id, null, '毕业照那天下了一场小雨，反而拍出了最喜欢的一张。', 'VISIBLE', '2026-06-21T20:15:00+08:00'],
      ['demo-msg-02', members[1].id, null, '谁还记得晚自习停电那晚，全班一起唱的歌？', 'VISIBLE', '2026-06-20T22:40:00+08:00'],
      ['demo-msg-03', members[2].id, null, '翻到高一运动会的老照片，大家晒得通红还在笑。', 'VISIBLE', '2026-06-19T18:05:00+08:00'],
      ['demo-msg-04', members[3].id, admin.id, '班长，教室最后一排的窗边座位，能永远留给我们吗？', 'VISIBLE', '2026-06-18T21:10:00+08:00'],
      ['demo-msg-05', members[4].id, null, '愿我们各自发光，也常回来看看。', 'VISIBLE', '2026-06-17T08:30:00+08:00'],
      ['demo-msg-06', members[5].id, null, '食堂二楼的糖醋里脊，我宣布是青春限定。', 'VISIBLE', '2026-06-16T12:20:00+08:00'],
      ['demo-msg-07', members[6].id, null, '十年后再翻这本同学录，希望我们都还是老样子。', 'VISIBLE', '2026-06-15T23:05:00+08:00'],
      ['demo-msg-08', members[7].id, members[0].id, '下次一起去看海吧，带上相机。', 'VISIBLE', '2026-06-14T19:45:00+08:00'],
      ['demo-msg-09', members[8].id, null, '这是一条用于演示管理员审核功能的隐藏留言。', 'HIDDEN', '2026-06-13T10:00:00+08:00'],
    ] as const;
    for (const [id, authorId, toUserId, content, status, createdAt] of messages) {
      await tx.message.create({
        data: { id, authorId, toUserId, content, status, createdAt: date(createdAt) },
      });
    }

    await tx.siteSetting.upsert({
      where: { id: 1 },
      update: {
        className: '数字媒体1班',
        schoolName: '云川职业技术学院',
        graduationYear: 2027,
        slogan: '把青春写进同一本册子',
        heroImageUrl: images['hero.jpg'],
        defaultTheme: 'warm',
      },
      create: {
        id: 1,
        className: '数字媒体1班',
        schoolName: '云川职业技术学院',
        graduationYear: 2027,
        slogan: '把青春写进同一本册子',
        heroImageUrl: images['hero.jpg'],
        defaultTheme: 'warm',
      },
    });
  });

  console.log(`演示数据已生成。管理员：${ADMIN_USERNAME}`);
  console.log(`成员密码：${MEMBER_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
