import { Chip } from '@heroui/react';
import { albumsApi } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useSiteCopy } from '@/lib/siteCopy';
import { IconAlbum, IconCamera } from '@/components/icons';
import { AlbumCard } from '@/components/content/AlbumCard';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { AlbumGridSkeleton } from '@/components/content/ContentSkeletons';
import { PageShell } from '@/components/content/PageShell';

export default function AlbumsPage() {
  const { copy } = useSiteCopy();
  const { data, loading, error, reload } = useAsyncData(() => albumsApi.list(), []);

  return (
    <PageShell
      action={
        data ? (
          <Chip color="accent" size="sm" variant="soft">
            <IconAlbum className="size-3.5" />
            <Chip.Label>{data.items.length} 本相册</Chip.Label>
          </Chip>
        ) : undefined
      }
      description={copy.albumsDescription}
      eyebrow="光影留存"
      title={copy.albumsTitle}
    >
      {loading && !data && <AlbumGridSkeleton />}

      {!loading && error && (
        <ErrorPanel message={error} title="相册暂时打不开" onRetry={reload} />
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyPanel
          description={copy.albumsEmptyDescription}
          icon={<IconCamera className="size-5" />}
          title={copy.albumsEmptyTitle}
        />
      )}

      {data && data.items.length > 0 && (
        <div
          className={`grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 ${
            loading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {data.items.map((album) => (
            <AlbumCard album={album} key={album.id} />
          ))}
        </div>
      )}
    </PageShell>
  );
}