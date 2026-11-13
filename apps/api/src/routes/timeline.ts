import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../lib/auth';
import { toTimelineEventDto } from '../lib/serialize';

export const timelineRouter = Router();

timelineRouter.use(requireAuth);

timelineRouter.get('/', async (_req, res) => {
  const events = await prisma.timelineEvent.findMany({
    orderBy: [{ date: 'desc' }, { sortOrder: 'asc' }],
  });

  res.status(200).json({ items: events.map(toTimelineEventDto) });
});
