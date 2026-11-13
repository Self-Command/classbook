import { Link } from 'react-router-dom';
import type { AlbumSummaryDto } from '@classbook/shared';
import { Card, Chip } from '@heroui/react';
import { formatDate } from '@/lib/format';
import { IconAlbum, IconCamera } from '@/components/icons';

interface AlbumCardProps {
  album: AlbumSummaryDto;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link
      aria-label={`打开相册：${album.title}`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      to={`/albums/${album.id}`}
    >
      <Card className="h-full gap-0 overflow-hidden rounded-3xl border border-border/70 bg-surface p-0 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-default">
          {album.coverUrl ? (
            <img
              alt={album.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              src={album.coverUrl}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted">
              <IconAlbum className="size-9" />
            </div>
          )}
          <Chip
            className="absolute right-3 top-3 bg-foreground/70 text-background backdrop-blur"
            size="sm"
            variant="tertiary"
          >
            <IconCamera className="size-3.5" />
            <Chip.Label>{album.photoCount} 张照片</Chip.Label>
          </Chip>
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <h2 className="font-display text-xl leading-7 text-foreground transition group-hover:text-accent">
            {album.title}
          </h2>
          {album.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
              {album.description}
            </p>
          )}
          <p className="mt-auto pt-3 text-[11px] text-muted">
            创建于 {formatDate(album.createdAt)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
