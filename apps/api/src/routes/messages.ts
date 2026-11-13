import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { messageCreateSchema } from '@classbook/shared';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { requireAuth } from '../lib/auth';
import { emptyStringsToNull } from '../lib/normalize';
import { getPagination, getStringQuery } from '../lib/pagination';
import { toMessageDto } from '../lib/serialize';

const messageInclude = {
  author: { include: { profile: true } },
  toUser: { include: { profile: true } },
} satisfies Prisma.MessageInclude;

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

messagesRouter.get('/', async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const toUserId = getStringQuery(req.query.toUserId);

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
  } else {
    where.toUserId = null;
  }

  const [total, messages] = await prisma.$transaction([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.status(200).json({
    items: messages.map(toMessageDto),
    total,
    page,
    pageSize,
  });
});

messagesRouter.post('/', async (req, res) => {
  const body = emptyStringsToNull(req.body, ['toUserId']);
  const data = messageCreateSchema.parse(body);
  const toUserId = data.toUserId ?? null;

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
    },
    include: messageInclude,
  });

  res.status(201).json({ message: toMessageDto(message) });
});

messagesRouter.delete('/:id', async (req, res) => {
  const message = await prisma.message.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true },
  });

  if (!message) {
    throw new ApiError(404, 'NOT_FOUND', '留言不存在');
  }

  if (message.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', '无权删除该留言');
  }

  await prisma.message.delete({ where: { id: message.id } });
  res.status(204).end();
});
