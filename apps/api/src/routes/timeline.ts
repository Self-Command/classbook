import { Router } from 'express';
import { timelineCreateSchema } from '@classbook/shared';
import { prisma } from '../db';
import { requireAuth } from '../lib/auth';
import { emptyStringsToNull } from '../lib/normalize';
import { toTimelineEventDto } from '../lib/serialize';

export const timelineRouter = Router();

timelineRouter.use(requireAuth);

timelineRouter.get('/', async (_req, res) => {
  const events = await prisma.timelineEvent.findMany({
    orderBy: [{ date: 'desc' }, { sortOrder: 'asc' }],
  });

  res.status(200).json({ items: events.map(toTimelineEventDto) });
});

timelineRouter.post('/', async (req, res) => {
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
