import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { messageCreateSchema } from '@classbook/shared';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { requireAuth } from '../lib/auth';
import { emptyStringsToNull } from '../lib/normalize';
import { getPagination, getStringQuery } from '../lib/pagination';
import { toMessageDto } from '../lib/serialize';
import { notifyMentions, notifyProfileMessage } from '../lib/notifications';
import { deleteUploadFile } from '../lib/delete-upload';
import { createRateLimit } from '../lib/rate-limit';

export const messagesRouter = Router();

const messageCreateLimit = createRateLimit({ windowMs: 60_000, max: 10 });

function buildInclude(viewerId?: string | null) {
  return {
    author: { include: { profile: true } },
    toUser: { include: { profile: true } },
    likes: { where: { userId: viewerId ?? '__none__' }, select: { userId: true } },
  } satisfies Prisma.MessageInclude;
}

messagesRouter.use(requireAuth);

messagesRouter.get('/', async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const toUserId = getStringQuery(req.query.toUserId);
  const viewerId = req.user!.id;

  const where: Prisma.MessageWhereInput = { status: 'VISIBLE' };

  if (toUserId) {
    const target = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, status: true },
    });
    if (!target || target.status !== 'ACTIVE') {
      throw new ApiError(404, 'NOT_FOUND', '同学不存在');
    }

    where.toUserId = toUserId;
    where.OR = [
      { visibility: 'PUBLIC' },
      { visibility: 'PRIVATE', authorId: viewerId },
      { visibility: 'PRIVATE', toUserId: viewerId },
    ];
  } else {
    where.toUserId = null;
    where.visibility = 'PUBLIC';
  }

  const [total, messages] = await prisma.$transaction([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      include: buildInclude(viewerId),
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.status(200).json({
    items: messages.map((message) => toMessageDto(message, viewerId)),
    total,
    page,
    pageSize,
  });
});

messagesRouter.post('/', messageCreateLimit, async (req, res) => {
  const body = emptyStringsToNull(req.body, ['toUserId']);
  const data = messageCreateSchema.parse(body);
  const toUserId = data.toUserId ?? null;
  const visibility = data.visibility ?? 'PUBLIC';

  if (visibility === 'PRIVATE' && !toUserId) {
    throw new ApiError(400, 'BAD_REQUEST', '私密留言必须指定接收人');
  }

  if (toUserId) {
    const target = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, status: true },
    });
    if (!target || target.status !== 'ACTIVE') {
      throw new ApiError(404, 'NOT_FOUND', '同学不存在');
    }
  }

  const message = await prisma.message.create({
    data: {
      content: data.content,
      authorId: req.user!.id,
      toUserId,
      visibility,
      images: data.images ?? [],
    },
    include: buildInclude(req.user!.id),
  });

  const preview = data.content.slice(0, 80);

  if (toUserId) {
    await notifyProfileMessage({
      recipientId: toUserId,
      actorId: req.user!.id,
      messageId: message.id,
      preview,
    });
  }

  await notifyMentions({
    actorId: req.user!.id,
    content: data.content,
    messageId: message.id,
    preview,
  });

  res.status(201).json({ message: toMessageDto(message, req.user!.id) });
});

messagesRouter.delete('/:id', async (req, res) => {
  const message = await prisma.message.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, toUserId: true, visibility: true, images: true },
  });

  if (!message) {
    throw new ApiError(404, 'NOT_FOUND', '留言不存在');
  }

  const isAdmin = req.user!.role === 'ADMIN';

  if (message.visibility === 'PRIVATE') {
    const isParticipant =
      message.authorId === req.user!.id || message.toUserId === req.user!.id;
    if (!isParticipant) {
      throw new ApiError(403, 'FORBIDDEN', '无权删除该留言');
    }
  } else if (message.authorId !== req.user!.id && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', '无权删除该留言');
  }

  await prisma.message.delete({ where: { id: message.id } });
  await Promise.allSettled(message.images.map((url) => deleteUploadFile(url)));

  res.status(204).end();
});
