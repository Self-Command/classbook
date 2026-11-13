import { Router } from 'express';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { requireAuth } from '../lib/auth';
import { toAlbumDto, toAlbumSummaryDto } from '../lib/serialize';

export const albumsRouter = Router();

albumsRouter.use(requireAuth);

albumsRouter.get('/', async (_req, res) => {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      photos: {
        take: 1,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { url: true },
      },
      _count: { select: { photos: true } },
    },
  });

  res.status(200).json({
    items: albums.map((album) =>
      toAlbumSummaryDto(album, album._count.photos, album.photos[0]?.url ?? null),
    ),
  });
});

albumsRouter.get('/:id', async (req, res) => {
  const album = await prisma.album.findUnique({
    where: { id: req.params.id },
    include: {
      photos: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!album) {
    throw new ApiError(404, 'NOT_FOUND', '相册不存在');
  }

  res.status(200).json({ album: toAlbumDto(album) });
});
