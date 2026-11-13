import { Chip } from '@heroui/react';
import { albumsApi } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { IconAlbum, IconCamera } from '@/components/icons';
import { AlbumCard } from '@/components/content/AlbumCard';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { AlbumGridSkeleton } from '@/components/content/ContentSkeletons';
import { PageShell } from '@/components/content/PageShell';

export default function AlbumsPage() {
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
      description="快门按下的一瞬间，时间就被留了下来。"
      eyebrow="光影留存"
      title="班级相册"
    >
      {loading && !data && <AlbumGridSkeleton />}

      {!loading && error && (
        <ErrorPanel message={error} title="相册暂时打不开" onRetry={reload} />
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyPanel
          description="等管理员把第一组照片放进来，这里就会有颜色了。"
          icon={<IconCamera className="size-5" />}
          title="相册还是空的"
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