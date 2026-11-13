import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { profileUpdateSchema } from '@classbook/shared';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { requireAuth } from '../lib/auth';
import { emptyStringsToNull } from '../lib/normalize';
import { getPagination, getStringQuery } from '../lib/pagination';
import { toProfileDto, toPublicProfileDto } from '../lib/serialize';

const NULLABLE_PROFILE_FIELDS = [
  'nickname',
  'avatarUrl',
  'motto',
  'bio',
  'location',
  'birthday',
  'wechat',
  'qq',
  'email',
  'phone',
] as const;

function asNullable(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === null || value === '' ? null : value;
}

export const profilesRouter = Router();

profilesRouter.use(requireAuth);

profilesRouter.get('/', async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const q = getStringQuery(req.query.q);

  const where: Prisma.UserWhereInput = {
    status: 'ACTIVE',
    profile: q
      ? {
          is: {
            OR: [
              { realName: { contains: q, mode: 'insensitive' } },
              { nickname: { contains: q, mode: 'insensitive' } },
            ],
          },
        }
      : { isNot: null },
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { profile: true },
      orderBy: { profile: { updatedAt: 'desc' } },
      skip,
      take,
    }),
  ]);

  res.status(200).json({
    items: users.flatMap((user) => (user.profile ? [toPublicProfileDto(user.profile)] : [])),
    total,
    page,
    pageSize,
  });
});

profilesRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { profile: true },
  });

  if (!user || user.status !== 'ACTIVE' || !user.profile) {
    throw new ApiError(404, 'NOT_FOUND', '同学不存在');
  }

  res.status(200).json({
    profile: toProfileDto(user.profile),
    username: user.username,
  });
});

profilesRouter.patch('/me', async (req, res) => {
  const body = emptyStringsToNull(req.body, NULLABLE_PROFILE_FIELDS);
  const data = profileUpdateSchema.parse(body);
  const userId = req.user!.id;

  const update: Prisma.ProfileUpdateInput = {};
  if (data.realName !== undefined) update.realName = data.realName;
  if (data.nickname !== undefined) update.nickname = asNullable(data.nickname);
  if (data.avatarUrl !== undefined) update.avatarUrl = asNullable(data.avatarUrl);
  if (data.motto !== undefined) update.motto = asNullable(data.motto);
  if (data.bio !== undefined) update.bio = asNullable(data.bio);
  if (data.location !== undefined) update.location = asNullable(data.location);
  if (data.birthday !== undefined) update.birthday = asNullable(data.birthday);
  if (data.wechat !== undefined) update.wechat = asNullable(data.wechat);
  if (data.qq !== undefined) update.qq = asNullable(data.qq);
  if (data.email !== undefined) update.email = asNullable(data.email);
  if (data.phone !== undefined) update.phone = asNullable(data.phone);

  const profile = await prisma.profile.update({
    where: { userId },
    data: update,
  });

  res.status(200).json({ profile: toProfileDto(profile) });
});
