import 'dotenv/config';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (process.env.CONFIRM_RESET !== 'yes') {
  console.error('这会清空开发库的全部同学与内容。确认请设置 CONFIRM_RESET=yes 后重跑。');
  process.exit(1);
}

async function main() {
  await prisma.message.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.album.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'MEMBER' } });
  await prisma.inviteCode.deleteMany();

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    await prisma.profile.upsert({
      where: { userId: admin.id },
      update: {
        realName: '管理员',
        nickname: null,
        avatarUrl: null,
        motto: null,
        bio: null,
        location: null,
        birthday: null,
        wechat: null,
        qq: null,
        email: null,
        phone: null,
      },
      create: { userId: admin.id, realName: '管理员' },
    });
  }

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {
      className: '我们的班级',
      schoolName: null,
      graduationYear: 2026,
      slogan: '青春不散场',
      heroImageUrl: null,
    },
    create: {
      id: 1,
      className: '我们的班级',
      graduationYear: 2026,
      slogan: '青春不散场',
    },
  });

  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
  try {
    const files = await readdir(uploadDir);
    await Promise.all(
      files.map(async (file) => {
        try {
          await unlink(path.join(uploadDir, file));
        } catch {
          // ignore
        }
      }),
    );
  } catch {
    // 目录不存在时忽略
  }

  console.log('开发数据已重置：保留管理员，清空成员、留言、相册、时间线、邀请码与上传文件。');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
