import { Router } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import {
  inviteValidateSchema,
  loginSchema,
  passwordChangeSchema,
  registerSchema,
  themePreferenceSchema,
} from '@classbook/shared';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { clearAuthCookie, requireAuth, setAuthCookie, signAuthToken } from '../lib/auth';
import { isInviteUsable } from '../lib/invite';
import { toUserDto } from '../lib/serialize';
import { config } from '../config';

const BCRYPT_COST = 10;

function createAuthLimiter(message: string) {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.nodeEnv === 'test',
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    },
  });
}

const loginLimiter = createAuthLimiter('登录尝试过于频繁，请 10 分钟后再试');
const registerLimiter = createAuthLimiter('注册请求过于频繁，请 10 分钟后再试');
const inviteLimiter = createAuthLimiter('邀请码校验过于频繁，请 10 分钟后再试');

export const authRouter = Router();

authRouter.post('/register', registerLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);

  const invite = await prisma.inviteCode.findUnique({ where: { code: data.inviteCode } });
  if (!isInviteUsable(invite)) {
    throw new ApiError(400, 'INVALID_INVITE', '邀请码无效或已用完');
  }

  const existing = await prisma.user.findUnique({
    where: { username: data.username },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'USERNAME_TAKEN', '用户名已被使用');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const updated = await tx.inviteCode.updateMany({
        where: {
          id: invite.id,
          disabled: false,
          usedCount: { lt: invite.maxUses },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { usedCount: { increment: 1 } },
      });

      if (updated.count === 0) {
        throw new ApiError(400, 'INVALID_INVITE', '邀请码无效或已用完');
      }

      return tx.user.create({
        data: {
          username: data.username,
          passwordHash,
          inviteCodeId: invite.id,
          profile: { create: { realName: data.realName } },
        },
        include: { profile: true },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, 'USERNAME_TAKEN', '用户名已被使用');
    }
    throw error;
  }

  setAuthCookie(res, signAuthToken(user));
  res.status(201).json({ user: toUserDto(user) });
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { username: data.username },
    include: { profile: true },
  });

  const passwordMatches = user ? await bcrypt.compare(data.password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  }
  if (user.status !== 'ACTIVE') {
    throw new ApiError(403, 'USER_DISABLED', '账号已被禁用');
  }

  setAuthCookie(res, signAuthToken(user));
  res.status(200).json({ user: toUserDto(user) });
});

authRouter.post('/logout', requireAuth, (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: toUserDto(req.user!) });
});

authRouter.patch('/password', requireAuth, async (req, res) => {
  const data = passwordChangeSchema.parse(req.body);
  const currentUser = req.user!;

  const matches = await bcrypt.compare(data.currentPassword, currentUser.passwordHash);
  if (!matches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', '当前密码不正确');
  }

  const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_COST);
  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  setAuthCookie(res, signAuthToken(updated));
  res.status(204).end();
});

authRouter.patch('/preferences', requireAuth, async (req, res) => {
  const data = themePreferenceSchema.parse(req.body);
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { theme: data.theme },
    include: { profile: true },
  });

  res.status(200).json({ user: toUserDto(updated) });
});

authRouter.post('/invite/validate', inviteLimiter, async (req, res) => {
  const data = inviteValidateSchema.parse(req.body);
  const invite = await prisma.inviteCode.findUnique({ where: { code: data.code } });
  res.status(200).json({ valid: isInviteUsable(invite) });
});
