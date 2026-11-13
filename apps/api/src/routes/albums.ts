import { Router } from 'express';
import { prisma } from '../db';
import { ApiError } from '../lib/api-error';
import { requireAuth } from '../lib/auth';
import {
  addAlbumPhotos,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  updateAlbum,
} from '../lib/album-service';
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

albumsRouter.post('/', async (req, res) => {
  const album = await createAlbum(req.user!.id, req.body);
  res.status(201).json({ album });
});

albumsRouter.patch('/:id', async (req, res) => {
  const album = await updateAlbum(req.params.id, req.body);
  res.status(200).json({ album });
});

albumsRouter.delete('/:id', async (req, res) => {
  await deleteAlbum(req.params.id);
  res.status(204).end();
});

albumsRouter.post('/:id/photos', async (req, res) => {
  const photos = await addAlbumPhotos(req.params.id, req.body);
  res.status(201).json({ photos });
});

albumsRouter.delete('/photos/:id', async (req, res) => {
  await deletePhoto(req.params.id);
  res.status(204).end();
});
