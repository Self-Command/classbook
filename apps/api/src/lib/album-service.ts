import type { AlbumSummaryDto, PhotoDto } from '@classbook/shared';
import type { Prisma } from '@prisma/client';
import { albumCreateSchema, albumUpdateSchema, photoAttachSchema } from '@classbook/shared';
import { prisma } from '../db';
import { ApiError } from './api-error';
import { deleteUploadFile } from './delete-upload';
import { emptyStringsToNull } from './normalize';
import { toAlbumSummaryDto, toPhotoDto } from './serialize';

const albumSummaryInclude = {
  photos: {
    take: 1,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { url: true },
  },
  _count: { select: { photos: true } },
} satisfies Prisma.AlbumInclude;

export async function createAlbum(createdById: string, body: unknown): Promise<AlbumSummaryDto> {
  const data = albumCreateSchema.parse(emptyStringsToNull(body, ['description']));

  const album = await prisma.album.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      createdById,
    },
  });

  return toAlbumSummaryDto(album, 0, null);
}

export async function updateAlbum(albumId: string, body: unknown): Promise<AlbumSummaryDto> {
  const data = albumUpdateSchema.parse(emptyStringsToNull(body, ['description', 'coverUrl']));

  const existing = await prisma.album.findUnique({
    where: { id: albumId },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', '相册不存在');
  }

  const album = await prisma.album.update({
    where: { id: existing.id },
    data,
    include: albumSummaryInclude,
  });

  return toAlbumSummaryDto(album, album._count.photos, album.photos[0]?.url ?? null);
}

export async function deleteAlbum(albumId: string): Promise<void> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: { photos: { select: { url: true, videoUrl: true } } },
  });
  if (!album) {
    throw new ApiError(404, 'NOT_FOUND', '相册不存在');
  }

  await prisma.album.delete({ where: { id: album.id } });

  const urls = album.photos.flatMap((photo) => [photo.url, photo.videoUrl ?? null]);
  if (album.coverUrl) urls.push(album.coverUrl);
  await Promise.allSettled(urls.map((url) => deleteUploadFile(url)));
}

export async function addAlbumPhotos(albumId: string, body: unknown): Promise<PhotoDto[]> {
  const data = photoAttachSchema.parse(emptyStringsToNull(body, ['caption']));

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { id: true },
  });
  if (!album) {
    throw new ApiError(404, 'NOT_FOUND', '相册不存在');
  }

  const aggregate = await prisma.photo.aggregate({
    where: { albumId: album.id },
    _max: { sortOrder: true },
  });
  const startOrder = aggregate._max.sortOrder === null ? 0 : aggregate._max.sortOrder + 1;

  const items = data.photos ?? (data.urls ?? []).map((url) => ({ url, videoUrl: null }));

  const photos = await prisma.$transaction(
    items.map((item, index) =>
      prisma.photo.create({
        data: {
          albumId: album.id,
          url: item.url,
          videoUrl: item.videoUrl ?? null,
          caption: data.caption ?? null,
          sortOrder: startOrder + index,
        },
      }),
    ),
  );

  return photos.map(toPhotoDto);
}

export async function deletePhoto(photoId: string): Promise<void> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, url: true, videoUrl: true },
  });
  if (!photo) {
    throw new ApiError(404, 'NOT_FOUND', '照片不存在');
  }

  await prisma.photo.delete({ where: { id: photo.id } });
  await Promise.all([deleteUploadFile(photo.url), deleteUploadFile(photo.videoUrl)]);
}
