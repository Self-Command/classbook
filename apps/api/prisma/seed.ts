import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('请通过 ADMIN_PASSWORD 环境变量设置管理员初始密码');
  }
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: {
      username,
      passwordHash,
      role: 'ADMIN',
      profile: { create: { realName: '管理员' } },
    },
  });

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      className: '我们的班级',
      graduationYear: new Date().getFullYear(),
      slogan: '青春不散场',
    },
  });

  console.log(`Seed 完成：管理员 ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
