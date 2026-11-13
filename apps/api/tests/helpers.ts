import bcrypt from 'bcryptjs';
import request, { type Response } from 'supertest';
import type { Role, UserStatus } from '@classbook/shared';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

export const app = createApp();

export type TestAgent = ReturnType<typeof request.agent>;

export const TEST_PASSWORD = 'password123';

export interface CreateUserOptions {
  username: string;
  password?: string;
  role?: Role;
  status?: UserStatus;
  realName?: string;
  nickname?: string;
}

export async function resetDb(): Promise<void> {
  await prisma.message.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.album.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.siteSetting.deleteMany();
}

export async function createUser(options: CreateUserOptions) {
  const password = options.password ?? TEST_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 4);

  return prisma.user.create({
    data: {
      username: options.username,
      passwordHash,
      role: options.role ?? 'MEMBER',
      status: options.status ?? 'ACTIVE',
      profile: {
        create: {
          realName: options.realName ?? options.username,
          nickname: options.nickname ?? null,
        },
      },
    },
    include: { profile: true },
  });
}

export async function createAdmin(username = 'admin') {
  return createUser({ username, role: 'ADMIN', realName: '管理员' });
}

export async function createInvite(options: {
  code: string;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: Date | null;
  disabled?: boolean;
  note?: string | null;
}) {
  return prisma.inviteCode.create({
    data: {
      code: options.code,
      maxUses: options.maxUses ?? 1,
      usedCount: options.usedCount ?? 0,
      expiresAt: options.expiresAt ?? null,
      disabled: options.disabled ?? false,
      note: options.note ?? null,
    },
  });
}

export function getCookie(response: Response, name = 'cb_token'): string {
  const header = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : header ? [header] : [];

  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split(';')[0];
    }
  }
  throw new Error(`响应中未找到 Cookie ${name}`);
}

export async function loginAgent(
  username: string,
  password = TEST_PASSWORD,
): Promise<TestAgent> {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ username, password });
  if (response.status !== 200) {
    throw new Error(`登录失败: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return agent;
}
