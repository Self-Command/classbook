import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Chip, Skeleton } from '@heroui/react';
import { albumsApi } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { formatDate } from '@/lib/format';
import { IconAlbum, IconCamera } from '@/components/icons';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { LivePhotoView } from '@/components/content/LivePhotoView';
import { PhotoLightbox } from '@/components/content/PhotoLightbox';
import { BackLink, PageShell } from '@/components/content/PageShell';

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLightboxIndex(null);
  }, [id]);

  const { data, loading, error, reload } = useAsyncData(
    () => {
      if (!id) return Promise.reject(new Error('缺少相册 ID'));
      return albumsApi.get(id);
    },
    [id],
  );

  if (loading && !data) {
    return (
      <PageShell
        back={<BackLink to="/albums">返回相册</BackLink>}
        description="正在翻开相册，照片马上就好。"
        eyebrow="光影留存"
        title="相册"
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton className="aspect-square rounded-2xl" key={index} />
          ))}
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell
        back={<BackLink to="/albums">返回相册</BackLink>}
        description="相册可能已经被移走了，看看其他相册吧。"
        eyebrow="光影留存"
        title="这本相册暂时打不开"
      >
        <ErrorPanel
          message={error ?? '没有找到这本相册。'}
          title="相册暂时打不开"
          onRetry={reload}
        />
      </PageShell>
    );
  }

  const { album } = data;

  return (
    <PageShell
      action={
        <Chip color="accent" size="sm" variant="soft">
          <IconAlbum className="size-3.5" />
          <Chip.Label>{album.photoCount} 张照片</Chip.Label>
        </Chip>
      }
      back={<BackLink to="/albums">返回相册</BackLink>}
      description={album.description ?? undefined}
      eyebrow="光影留存"
      title={album.title}
    >
      <p className="-mt-3 mb-6 text-xs text-muted">
        创建于 {formatDate(album.createdAt)}
      </p>

      {album.photos.length === 0 ? (
        <EmptyPanel
          description="再等一等，旧时光正在洗印中。"
          icon={<IconCamera className="size-5" />}
          title="相册里还没有照片"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {album.photos.map((photo, index) => (
              <div
                key={photo.id}
                role="button"
                tabIndex={0}
                aria-label={`查看第 ${index + 1} 张照片${photo.caption ? `：${photo.caption}` : ''}`}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-default shadow-sm transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button')) return;
                  setLightboxIndex(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setLightboxIndex(index);
                  }
                }}
              >
                {photo.videoUrl ? (
                  <LivePhotoView
                    className="h-full w-full"
                    photoSrc={photo.url}
                    videoSrc={photo.videoUrl}
                  />
                ) : (
                  <img
                    alt={photo.caption ?? album.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                    src={photo.url}
                  />
                )}
                {photo.videoUrl ? (
                  <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    实况
                  </span>
                ) : null}
                {photo.caption && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-foreground/60 px-2.5 py-1.5 text-left text-[11px] leading-4 text-background backdrop-blur-sm">
                    {photo.caption}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-[11px] text-muted">
            点击照片查看大图；实况照片悬停或长按即可播放。可使用左右方向键切换，按 Esc 关闭。
          </p>
        </>
      )}

      <PhotoLightbox
        albumTitle={album.title}
        index={lightboxIndex}
        photos={album.photos}
        onChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </PageShell>
  );
}