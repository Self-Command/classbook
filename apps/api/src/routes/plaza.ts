import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { commentCreateSchema, messageCreateSchema } from '@classbook/shared';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { requireAuth } from '../lib/auth';
import { emptyStringsToNull } from '../lib/normalize';
import { toMessageCommentDto, toMessageDto } from '../lib/serialize';
import { notifyPostComment, notifyPostLike } from '../lib/notifications';
import { deleteUploadFile } from '../lib/delete-upload';
import { createRateLimit } from '../lib/rate-limit';

export const plazaRouter = Router();

const postCreateLimit = createRateLimit({ windowMs: 60_000, max: 10 });
const commentLimit = createRateLimit({ windowMs: 60_000, max: 10 });
const likeLimit = createRateLimit({ windowMs: 60_000, max: 60 });

const COMMENTS_MAX = 200;

interface ParsedCursor {
  createdAt: Date;
  id: string;
}

function parseCursor(cursor: string | undefined): ParsedCursor | null {
  if (!cursor) return null;
  const separatorIndex = cursor.indexOf('|');
  if (separatorIndex <= 0) {
    throw new ApiError(400, 'BAD_REQUEST', '无效的分页参数');
  }
  const iso = cursor.slice(0, separatorIndex);
  const id = cursor.slice(separatorIndex + 1);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || !id) {
    throw new ApiError(400, 'BAD_REQUEST', '无效的分页参数');
  }
  return { createdAt: date, id };
}

function cursorWhere(cursor: ParsedCursor | null): Prisma.MessageWhereInput {
  if (!cursor) return {};
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

function buildInclude(viewerId: string) {
  return {
    author: { include: { profile: true } },
    toUser: { include: { profile: true } },
    likes: { where: { userId: viewerId }, select: { userId: true } },
  } satisfies Prisma.MessageInclude;
}

async function getVisiblePost(id: string) {
  const post = await prisma.message.findUnique({
    where: { id },
    include: { author: { select: { id: true } } },
  });
  if (!post || post.status !== 'VISIBLE' || post.visibility !== 'PUBLIC') {
    throw new ApiError(404, 'NOT_FOUND', '帖子不存在');
  }
  return post;
}

plazaRouter.use(requireAuth);

plazaRouter.get('/', async (req, res) => {
  const viewerId = req.user!.id;
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
  const cursor = parseCursor(
    typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
  );

  const where: Prisma.MessageWhereInput = {
    status: 'VISIBLE',
    visibility: 'PUBLIC',
    ...cursorWhere(cursor),
  };

  const posts = await prisma.message.findMany({
    where,
    include: buildInclude(viewerId),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const last = items[items.length - 1];

  res.status(200).json({
    items: items.map((post) => toMessageDto(post, viewerId)),
    nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  });
});

plazaRouter.get('/:id', async (req, res) => {
  const viewerId = req.user!.id;
  const post = await getVisiblePost(req.params.id);

  const [fullPost, comments] = await prisma.$transaction([
    prisma.message.findUnique({ where: { id: post.id }, include: buildInclude(viewerId) }),
    prisma.messageComment.findMany({
      where: { messageId: post.id },
      include: { author: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' },
      take: COMMENTS_MAX,
    }),
  ]);

  if (!fullPost) {
    throw new ApiError(404, 'NOT_FOUND', '帖子不存在');
  }

  res.status(200).json({
    post: toMessageDto(fullPost, viewerId),
    comments: comments.map(toMessageCommentDto),
  });
});

plazaRouter.post('/', postCreateLimit, async (req, res) => {
  const body = emptyStringsToNull(req.body, ['toUserId']);
  const data = messageCreateSchema.parse(body);

  if (data.toUserId) {
    throw new ApiError(400, 'BAD_REQUEST', '广场帖子不支持指定接收人');
  }

  const post = await prisma.message.create({
    data: {
      content: data.content,
      authorId: req.user!.id,
      toUserId: null,
      visibility: 'PUBLIC',
      images: data.images ?? [],
    },
    include: buildInclude(req.user!.id),
  });

  res.status(201).json({ post: toMessageDto(post, req.user!.id) });
});

plazaRouter.post('/:id/comments', commentLimit, async (req, res) => {
  const data = commentCreateSchema.parse(req.body);
  const post = await getVisiblePost(String(req.params.id));

  let parentId: string | null = null;
  let parentAuthorId: string | null = null;

  if (data.parentId) {
    const parent = await prisma.messageComment.findUnique({
      where: { id: data.parentId },
      select: { id: true, messageId: true, parentId: true, authorId: true },
    });
    if (!parent || parent.messageId !== post.id) {
      throw new ApiError(400, 'BAD_REQUEST', '回复的评论不存在');
    }
    if (parent.parentId) {
      throw new ApiError(400, 'BAD_REQUEST', '仅支持两级评论');
    }
    parentId = parent.id;
    parentAuthorId = parent.authorId;
  }

  const { comment } = await prisma.$transaction(async (tx) => {
    const created = await tx.messageComment.create({
      data: {
        messageId: post.id,
        authorId: req.user!.id,
        parentId,
        content: data.content,
      },
      include: { author: { include: { profile: true } } },
    });
    await tx.message.update({
      where: { id: post.id },
      data: { commentCount: { increment: 1 } },
    });
    return { comment: created };
  });

  await notifyPostComment({
    postAuthorId: post.authorId,
    parentAuthorId,
    actorId: req.user!.id,
    messageId: post.id,
    commentId: comment.id,
    preview: data.content.slice(0, 80),
  });

  res.status(201).json({ comment: toMessageCommentDto(comment) });
});

plazaRouter.delete('/comments/:id', async (req, res) => {
  const comment = await prisma.messageComment.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      authorId: true,
      messageId: true,
      parentId: true,
      message: { select: { authorId: true, visibility: true, status: true } },
    },
  });

  if (!comment || comment.message.status !== 'VISIBLE') {
    throw new ApiError(404, 'NOT_FOUND', '评论不存在');
  }

  const isAdmin = req.user!.role === 'ADMIN';
  const canDelete =
    comment.authorId === req.user!.id ||
    comment.message.authorId === req.user!.id ||
    isAdmin;

  if (!canDelete) {
    throw new ApiError(403, 'FORBIDDEN', '无权删除该评论');
  }

  const replyCount = comment.parentId
    ? 0
    : await prisma.messageComment.count({ where: { parentId: comment.id } });

  await prisma.$transaction([
    prisma.messageComment.delete({ where: { id: comment.id } }),
    prisma.message.update({
      where: { id: comment.messageId },
      data: { commentCount: { decrement: replyCount + 1 } },
    }),
  ]);

  res.status(204).end();
});

plazaRouter.post('/:id/like', likeLimit, async (req, res) => {
  const post = await getVisiblePost(String(req.params.id));

  const { likeCount, likedByMe } = await prisma.$transaction(async (tx) => {
    const existing = await tx.messageLike.findUnique({
      where: { messageId_userId: { messageId: post.id, userId: req.user!.id } },
    });
    if (existing) {
      return {
        likeCount: post.likeCount,
        likedByMe: true,
      };
    }
    await tx.messageLike.create({
      data: { messageId: post.id, userId: req.user!.id },
    });
    const updated = await tx.message.update({
      where: { id: post.id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return { likeCount: updated.likeCount, likedByMe: true };
  });

  if (likedByMe && post.authorId !== req.user!.id) {
    await notifyPostLike({
      recipientId: post.authorId,
      actorId: req.user!.id,
      messageId: post.id,
      preview: post.content.slice(0, 80),
    });
  }

  res.status(200).json({ likeCount, likedByMe });
});

plazaRouter.delete('/:id/like', likeLimit, async (req, res) => {
  const post = await getVisiblePost(String(req.params.id));

  const { likeCount, likedByMe } = await prisma.$transaction(async (tx) => {
    const deleted = await tx.messageLike.deleteMany({
      where: { messageId: post.id, userId: req.user!.id },
    });
    if (deleted.count === 0) {
      const current = await tx.message.findUnique({
        where: { id: post.id },
        select: { likeCount: true },
      });
      return { likeCount: current?.likeCount ?? 0, likedByMe: false };
    }
    const updated = await tx.message.update({
      where: { id: post.id },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    });
    return { likeCount: updated.likeCount, likedByMe: false };
  });

  res.status(200).json({ likeCount, likedByMe });
});

plazaRouter.delete('/:id', async (req, res) => {
  const post = await prisma.message.findUnique({
    where: { id: req.params.id },
    select: { id: true, authorId: true, images: true },
  });

  if (!post) {
    throw new ApiError(404, 'NOT_FOUND', '帖子不存在');
  }

  if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', '无权删除该帖子');
  }

  await prisma.message.delete({ where: { id: post.id } });
  await Promise.allSettled(post.images.map((url) => deleteUploadFile(url)));

  res.status(204).end();
});
