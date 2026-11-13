import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  MESSAGE_STATUSES,
  inviteCreateSchema,
  memberUpdateSchema,
  resetPasswordSchema,
  settingsUpdateSchema,
  timelineCreateSchema,
  timelineUpdateSchema,
} from '@classbook/shared';
import { prisma } from '../db';
import {
  addAlbumPhotos,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  updateAlbum,
} from '../lib/album-service';
import { ApiError } from '../lib/api-error';
import { requireAdmin, requireAuth } from '../lib/auth';
import { generateUniqueInviteCode } from '../lib/invite';
import { emptyStringsToNull } from '../lib/normalize';
import { getPagination, getStringQuery } from '../lib/pagination';
import {
  toAdminMemberDto,
  toInviteCodeDto,
  toMessageDto,
  toSiteSettingsDto,
  toTimelineEventDto,
} from '../lib/serialize';

const BCRYPT_COST = 10;

const messageInclude = {
  author: { include: { profile: true } },
  toUser: { include: { profile: true } },
} satisfies Prisma.MessageInclude;

const messageStatusQuerySchema = z.enum(MESSAGE_STATUSES).optional();

const memberInclude = {
  profile: true,
  _count: { select: { messages: true } },
} satisfies Prisma.UserInclude;

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/stats', async (_req, res) => {
  const now = new Date();

  const [
    memberCount,
    messageCount,
    hiddenMessageCount,
    privateMessageCount,
    photoCount,
    availableInvites,
    recentMessages,
  ] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.message.count(),
    prisma.message.count({ where: { status: 'HIDDEN' } }),
    prisma.message.count({ where: { visibility: 'PRIVATE' } }),
    prisma.photo.count(),
    prisma.inviteCode.findMany({
      where: {
        disabled: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { maxUses: true, usedCount: true },
    }),
    prisma.message.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: messageInclude,
    }),
  ]);

  res.status(200).json({
    memberCount,
    messageCount,
    hiddenMessageCount,
    privateMessageCount,
    photoCount,
    activeInviteCount: availableInvites.filter((invite) => invite.usedCount < invite.maxUses)
      .length,
    recentMessages: recentMessages.map((message) => toMessageDto(message)),
  });
});

adminRouter.get('/members', async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const q = getStringQuery(req.query.q);

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { profile: { is: { realName: { contains: q, mode: 'insensitive' } } } },
          { profile: { is: { nickname: { contains: q, mode: 'insensitive' } } } },
        ],
      }
    : {};

  const [total, members] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: memberInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.status(200).json({
    items: members.map((member) => toAdminMemberDto(member, member._count.messages)),
    total,
    page,
    pageSize,
  });
});

adminRouter.patch('/members/:id', async (req, res) => {
  const data = memberUpdateSchema.parse(req.body);
  const targetId = req.params.id;

  if (targetId === req.user!.id) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', '不能对自己的账号执行该操作');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: memberInclude,
  });
  if (!target) {
    throw new ApiError(404, 'NOT_FOUND', '成员不存在');
  }

  const shouldBumpTokenVersion =
    (data.status === 'DISABLED' && target.status !== 'DISABLED') ||
    (data.role !== undefined && data.role !== target.role);

  const update: Prisma.UserUpdateInput = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.role !== undefined) update.role = data.role;
  if (shouldBumpTokenVersion) update.tokenVersion = { increment: 1 };

  const member = await prisma.user.update({
    where: { id: target.id },
    data: update,
    include: memberInclude,
  });

  res.status(200).json({
    member: toAdminMemberDto(member, member._count.messages),
  });
});

adminRouter.post('/members/:id/reset-password', async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);
  const targetId = req.params.id;

  if (targetId === req.user!.id) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', '不能对自己的账号执行该操作');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!target) {
    throw new ApiError(404, 'NOT_FOUND', '成员不存在');
  }

  const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_COST);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  res.status(204).end();
});

adminRouter.get('/invite-codes', async (_req, res) => {
  const invites = await prisma.inviteCode.findMany({ orderBy: { createdAt: 'desc' } });
  res.status(200).json({ items: invites.map(toInviteCodeDto) });
});

adminRouter.post('/invite-codes', async (req, res) => {
  const body = emptyStringsToNull(req.body, ['note', 'expiresAt']);
  const data = inviteCreateSchema.parse(body);
  const code = await generateUniqueInviteCode();

  const invite = await prisma.inviteCode.create({
    data: {
      code,
      note: data.note ?? null,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt ?? null,
      createdById: req.user!.id,
    },
  });

  res.status(201).json({ invite: toInviteCodeDto(invite) });
});

adminRouter.delete('/invite-codes/:id', async (req, res) => {
  const invite = await prisma.inviteCode.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!invite) {
    throw new ApiError(404, 'NOT_FOUND', '邀请码不存在');
  }

  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: { disabled: true },
  });

  res.status(204).end();
});

adminRouter.get('/messages', async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const status = messageStatusQuerySchema.parse(req.query.status);

  const where: Prisma.MessageWhereInput = {
    visibility: 'PUBLIC',
    ...(status ? { status } : {}),
  };

  const [total, privateCount, messages] = await prisma.$transaction([
    prisma.message.count({ where }),
    prisma.message.count({ where: { visibility: 'PRIVATE', status: 'VISIBLE' } }),
    prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.status(200).json({
    items: messages.map((message) => toMessageDto(message)),
    total,
    privateCount,
    page,
    pageSize,
  });
});

adminRouter.patch('/messages/:id', async (req, res) => {
  const data = z.object({ status: z.enum(MESSAGE_STATUSES) }).parse(req.body);

  const existing = await prisma.message.findUnique({
    where: { id: req.params.id },
    select: { id: true, visibility: true },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', '留言不存在');
  }
  if (existing.visibility === 'PRIVATE') {
    throw new ApiError(403, 'FORBIDDEN', '私密留言仅双方可见，管理员无法操作');
  }

  const message = await prisma.message.update({
    where: { id: existing.id },
    data: { status: data.status },
    include: messageInclude,
  });

  res.status(200).json({ message: toMessageDto(message) });
});

adminRouter.post('/albums', async (req, res) => {
  const album = await createAlbum(req.user!.id, req.body);
  res.status(201).json({ album });
});

adminRouter.patch('/albums/:id', async (req, res) => {
  const album = await updateAlbum(req.params.id, req.body);
  res.status(200).json({ album });
});

adminRouter.delete('/albums/:id', async (req, res) => {
  await deleteAlbum(req.params.id);
  res.status(204).end();
});

adminRouter.post('/albums/:id/photos', async (req, res) => {
  const photos = await addAlbumPhotos(req.params.id, req.body);
  res.status(201).json({ photos });
});

adminRouter.delete('/photos/:id', async (req, res) => {
  await deletePhoto(req.params.id);
  res.status(204).end();
});

adminRouter.post('/timeline', async (req, res) => {
  const body = emptyStringsToNull(req.body, ['description', 'imageUrl']);
  const data = timelineCreateSchema.parse(body);

  const event = await prisma.timelineEvent.create({
    data: {
      date: data.date,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      sortOrder: data.sortOrder ?? 0,
      createdById: req.user!.id,
    },
  });

  res.status(201).json({ event: toTimelineEventDto(event) });
});

adminRouter.patch('/timeline/:id', async (req, res) => {
  const body = emptyStringsToNull(req.body, ['description', 'imageUrl']);
  const data = timelineUpdateSchema.parse(body);

  const existing = await prisma.timelineEvent.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', '时间线事件不存在');
  }

  const update: Prisma.TimelineEventUpdateInput = {};
  if (data.date !== undefined) update.date = data.date;
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.imageUrl !== undefined) update.imageUrl = data.imageUrl;
  if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder;

  const event = await prisma.timelineEvent.update({
    where: { id: existing.id },
    data: update,
  });

  res.status(200).json({ event: toTimelineEventDto(event) });
});

adminRouter.delete('/timeline/:id', async (req, res) => {
  const event = await prisma.timelineEvent.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!event) {
    throw new ApiError(404, 'NOT_FOUND', '时间线事件不存在');
  }

  await prisma.timelineEvent.delete({ where: { id: event.id } });
  res.status(204).end();
});

adminRouter.patch('/settings', async (req, res) => {
  const body = emptyStringsToNull(req.body, [
    'schoolName',
    'slogan',
    'heroImageUrl',
  ]);
  const { copy: copyPatch, ...data } = settingsUpdateSchema.parse(body);

  const existing = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  const existingCopy =
    existing?.copy && typeof existing.copy === 'object' && !Array.isArray(existing.copy)
      ? existing.copy
      : {};
  const copy = copyPatch ? { ...existingCopy, ...copyPatch } : undefined;

  const settings = await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: { ...data, ...(copy ? { copy } : {}) },
    create: { id: 1, ...data, ...(copy ? { copy } : {}) },
  });

  res.status(200).json(toSiteSettingsDto(settings));
});
