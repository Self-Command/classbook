import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { requireAuth } from '../lib/auth';
import { countUnread } from '../lib/notifications';
import { toNotificationDto } from '../lib/serialize';
import { notificationBus, type NotificationEvent } from '../lib/notification-bus';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

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

const actorInclude = {
  actor: { include: { profile: true } },
} as const;

notificationsRouter.get('/', async (req, res) => {
  const userId = req.user!.id;
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
  const cursor = parseCursor(
    typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
  );

  const where = {
    userId,
    ...(cursor
      ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : {}),
  };

  const [items, unreadRaw] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      include: actorInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  const unreadCount = unreadRaw;

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const last = page[page.length - 1];

  res.status(200).json({
    items: page.map(toNotificationDto),
    unreadCount,
    nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  });
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const unreadCount = await countUnread(req.user!.id);
  res.status(200).json({ unreadCount });
});

notificationsRouter.post('/read', async (req, res) => {
  const data = z
    .object({
      ids: z.array(z.string().trim().min(1)).max(200).optional(),
      all: z.boolean().optional(),
    })
    .parse(req.body);

  if (data.all) {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (data.ids && data.ids.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, id: { in: data.ids }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  const unreadCount = await countUnread(req.user!.id);
  res.status(200).json({ unreadCount });
});

notificationsRouter.get('/stream', async (req, res) => {
  const userId = req.user!.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 3000\n\n`);
  res.write(`event: ready\ndata: {"unreadCount": ${await countUnread(userId)}}\n\n`);

  const unsubscribe = notificationBus.subscribe(userId, (event: NotificationEvent) => {
    res.write(`event: notification\ndata: ${JSON.stringify(event)}\n\n`);
  });

  const ping = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25_000);

  const close = () => {
    clearInterval(ping);
    unsubscribe();
  };

  req.on('close', close);
  res.on('close', close);
});

const subscribeSchema = z.object({
  endpoint: z.string().trim().url().max(1024),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(256),
    auth: z.string().trim().min(1).max(256),
  }),
});

notificationsRouter.post('/subscribe', async (req, res) => {
  const data = subscribeSchema.parse(req.body);

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    update: {
      userId: req.user!.id,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
    },
    create: {
      userId: req.user!.id,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
    },
  });

  res.status(201).json({ id: subscription.id });
});

const unsubscribeSchema = z.object({
  endpoint: z.string().trim().min(1).max(1024),
});

notificationsRouter.delete('/subscribe', async (req, res) => {
  const data = unsubscribeSchema.parse(req.body);

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: data.endpoint, userId: req.user!.id },
  });

  res.status(204).end();
});

notificationsRouter.get('/vapid-public', async (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;
  res.status(200).json({ publicKey });
});
