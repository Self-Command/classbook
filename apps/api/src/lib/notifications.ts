import type { NotificationType } from '@classbook/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { toNotificationDto } from './serialize';
import { notificationBus, type NotificationEvent } from './notification-bus';
import { sendPushToUser } from './web-push';

const MENTION_REGEX = /@([A-Za-z0-9_-]{1,20})/g;
const MENTION_MAX = 10;

const actorInclude = {
  actor: { include: { profile: true } },
} satisfies Prisma.NotificationInclude;

const NOTIFICATION_TEXT: Record<NotificationType, string> = {
  PROFILE_MESSAGE: '在你的留言板留言',
  POST_COMMENT: '评论了你的帖子',
  COMMENT_REPLY: '回复了你',
  POST_LIKE: '赞了你的帖子',
  MENTION: '在帖子里提到了你',
};

function notificationText(type: NotificationType): string {
  return NOTIFICATION_TEXT[type] ?? '有一条新消息';
}

function notificationUrl(
  type: NotificationType,
  messageId: string | null,
  commentId: string | null,
): string {
  if (type === 'PROFILE_MESSAGE') return '/plaza';
  if (!messageId) return '/notifications';
  const hash = commentId ? `#comment-${commentId}` : '';
  return `/plaza/${messageId}${hash}`;
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function createNotification(input: {
  userId: string;
  actorId: string;
  type: NotificationType;
  messageId?: string | null;
  commentId?: string | null;
  preview?: string | null;
}): Promise<NotificationEvent | null> {
  if (input.userId === input.actorId) return null;

  const recipient = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { status: true },
  });
  if (!recipient || recipient.status !== 'ACTIVE') return null;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      messageId: input.messageId ?? null,
      commentId: input.commentId ?? null,
      preview: input.preview ?? null,
    },
    include: actorInclude,
  });

  const unreadCount = await countUnread(input.userId);
  const event: NotificationEvent = {
    notification: toNotificationDto(notification),
    unreadCount,
  };
  notificationBus.emit(input.userId, event);

  void sendPushToUser(input.userId, {
    title: notification.actor.profile?.realName ?? notification.actor.username,
    body: `${notificationText(input.type)}${input.preview ? `：${input.preview}` : ''}`,
    url: notificationUrl(input.type, notification.messageId, notification.commentId),
    tag: `notification-${notification.id}`,
  });

  return event;
}

export function extractMentions(content: string): string[] {
  const usernames = new Set<string>();
  for (const match of content.matchAll(MENTION_REGEX)) {
    usernames.add(match[1]);
    if (usernames.size >= MENTION_MAX) break;
  }
  return [...usernames];
}

export async function notifyMentions(input: {
  actorId: string;
  content: string;
  messageId: string;
  preview: string;
}): Promise<void> {
  const usernames = extractMentions(input.content);
  if (usernames.length === 0) return;

  const users = await prisma.user.findMany({
    where: { username: { in: usernames }, status: 'ACTIVE' },
    select: { id: true },
  });

  for (const user of users) {
    await createNotification({
      userId: user.id,
      actorId: input.actorId,
      type: 'MENTION',
      messageId: input.messageId,
      preview: input.preview,
    });
  }
}

export async function notifyProfileMessage(input: {
  recipientId: string;
  actorId: string;
  messageId: string;
  preview: string;
}): Promise<void> {
  await createNotification({
    userId: input.recipientId,
    actorId: input.actorId,
    type: 'PROFILE_MESSAGE',
    messageId: input.messageId,
    preview: input.preview,
  });
}

export async function notifyPostComment(input: {
  postAuthorId: string;
  parentAuthorId: string | null;
  actorId: string;
  messageId: string;
  commentId: string;
  preview: string;
}): Promise<void> {
  if (input.parentAuthorId && input.parentAuthorId !== input.actorId) {
    await createNotification({
      userId: input.parentAuthorId,
      actorId: input.actorId,
      type: 'COMMENT_REPLY',
      messageId: input.messageId,
      commentId: input.commentId,
      preview: input.preview,
    });
  }

  if (!input.parentAuthorId && input.postAuthorId !== input.actorId) {
    await createNotification({
      userId: input.postAuthorId,
      actorId: input.actorId,
      type: 'POST_COMMENT',
      messageId: input.messageId,
      commentId: input.commentId,
      preview: input.preview,
    });
  }
}

export async function notifyPostLike(input: {
  recipientId: string;
  actorId: string;
  messageId: string;
  preview: string;
}): Promise<void> {
  if (input.recipientId === input.actorId) return;

  await prisma.notification.deleteMany({
    where: {
      userId: input.recipientId,
      actorId: input.actorId,
      type: 'POST_LIKE',
      messageId: input.messageId,
    },
  });

  await createNotification({
    userId: input.recipientId,
    actorId: input.actorId,
    type: 'POST_LIKE',
    messageId: input.messageId,
    preview: input.preview,
  });
}
