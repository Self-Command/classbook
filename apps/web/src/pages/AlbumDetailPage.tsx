import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PhotoDto } from '@classbook/shared';
import { Button, Chip, Modal, Skeleton } from '@heroui/react';
import { albumsApi, getErrorMessage, type PhotoUpload } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import {
  IconAlbum,
  IconCamera,
  IconCheck,
  IconPencil,
  IconStar,
  IconTrash,
} from '@/components/icons';
import { AlbumFormModal, type AlbumFormValues } from '@/components/content/AlbumFormModal';
import { MultiImageUploader } from '@/components/content/MultiImageUploader';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { LivePhotoView } from '@/components/content/LivePhotoView';
import { PhotoLightbox } from '@/components/content/PhotoLightbox';
import { BackLink, PageShell } from '@/components/content/PageShell';
import { useToast } from '@/components/Toast';

interface ConfirmState {
  title: string;
  body: string;
  onConfirm: () => Promise<void>;
}

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const albumId = id ?? '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [coverBusyId, setCoverBusyId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    setLightboxIndex(null);
  }, [id]);

  const { data, loading, error, reload } = useAsyncData(
    () => {
      if (!albumId) return Promise.reject(new Error('缺少相册 ID'));
      return albumsApi.get(albumId);
    },
    [albumId],
  );

  const album = data?.album ?? null;

  const handleEdit = async (values: AlbumFormValues) => {
    if (!album) return;
    setEditBusy(true);
    setEditError('');
    try {
      await albumsApi.update(album.id, {
        title: values.title,
        description: values.description,
      });
      showToast('相册信息已更新');
      setEditOpen(false);
      reload();
    } catch (cause) {
      setEditError(getErrorMessage(cause));
    } finally {
      setEditBusy(false);
    }
  };

  const askDeleteAlbum = () => {
    if (!album) return;
    setConfirm({
      title: '删除相册',
      body: `确定要删除相册「${album.title}」吗？其中的 ${album.photos.length} 张照片会一并删除，且不可恢复。`,
      onConfirm: async () => {
        await albumsApi.remove(album.id);
        showToast(`相册「${album.title}」已删除`);
        navigate('/albums', { replace: true });
      },
    });
  };

  const askDeletePhoto = (photo: PhotoDto) => {
    setConfirm({
      title: '删除照片',
      body: '确定要删除这张照片吗？删除后无法恢复。',
      onConfirm: async () => {
        if (!album) return;
        await albumsApi.removePhoto(photo.id);
        if (album.coverUrl === photo.url) {
          await albumsApi.update(album.id, { coverUrl: null }).catch(() => undefined);
        }
        showToast('照片已删除');
        reload();
      },
    });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.onConfirm();
      setConfirm(null);
    } catch (cause) {
      showToast(getErrorMessage(cause), 'error');
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleSetCover = async (photo: PhotoDto) => {
    if (!album) return;
    setCoverBusyId(photo.id);
    try {
      await albumsApi.update(album.id, { coverUrl: photo.url });
      showToast('相册封面已更新');
      reload();
    } catch (cause) {
      showToast(getErrorMessage(cause), 'error');
    } finally {
      setCoverBusyId(null);
    }
  };

  const handleUploaded = async (photos: PhotoUpload[]) => {
    if (!album) return;
    await albumsApi.addPhotos(album.id, photos);
    reload();
  };

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

  if (error || !album) {
    return (
      <PageShell
        back={<BackLink to="/albums">返回相册</BackLink>}
        description="相册可能已经被移走了，看看其他相册吧。"
        eyebrow="光影留存"
        title="这本相册暂时打不开"
      >
        <ErrorPanel
          message={error ?? '没有找到这本相册。'}
          onRetry={reload}
          title="相册暂时打不开"
        />
      </PageShell>
    );
  }

  const canManage = Boolean(user);

  return (
    <PageShell
      action={
        <div className="flex items-center gap-2">
          <Chip color="accent" size="sm" variant="soft">
            <IconAlbum className="size-3.5" />
            <Chip.Label>{album.photoCount} 张照片</Chip.Label>
          </Chip>
          {canManage && (
            <>
              <Button
                aria-label="编辑相册"
                onPress={() => setEditOpen(true)}
                size="sm"
                variant="secondary"
              >
                <IconPencil className="size-4" />
                编辑
              </Button>
              <Button
                aria-label="删除相册"
                onPress={askDeleteAlbum}
                size="sm"
                variant="secondary"
              >
                <IconTrash className="size-4" />
                删除
              </Button>
            </>
          )}
        </div>
      }
      back={<BackLink to="/albums">返回相册</BackLink>}
      description={album.description ?? undefined}
      eyebrow="光影留存"
      title={album.title}
    >
      <p className="-mt-3 mb-6 text-xs text-muted">创建于 {formatDate(album.createdAt)}</p>

      {canManage && (
        <section className="mb-8 rounded-2xl border border-border/70 bg-surface/60 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">添加照片</h2>
              <p className="mt-0.5 text-xs text-muted">
                上传后立即加入相册，可以继续设置封面或删除。
              </p>
            </div>
            <Chip size="sm" variant={album.coverUrl ? 'primary' : 'soft'}>
              {album.coverUrl ? '已设置封面' : '未设置封面'}
            </Chip>
          </div>
          <MultiImageUploader disabled={uploadBusy} onUploaded={handleUploaded} />
        </section>
      )}

      {album.photos.length === 0 ? (
        <EmptyPanel
          description="再等一等，旧时光正在洗印中。"
          icon={<IconCamera className="size-5" />}
          title="相册里还没有照片"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {album.photos.map((photo, index) => {
              const isCover = album.coverUrl === photo.url;
              const coverBusy = coverBusyId === photo.id;
              return (
                <div
                  key={photo.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`查看第 ${index + 1} 张照片${photo.caption ? `：${photo.caption}` : ''}`}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-default shadow-sm transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('button[data-manage]')) return;
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
                  {isCover && (
                    <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-background shadow">
                      封面
                    </span>
                  )}
                  {photo.caption && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-foreground/60 px-2.5 py-1.5 text-left text-[11px] leading-4 text-background backdrop-blur-sm">
                      {photo.caption}
                    </span>
                  )}

                  {canManage && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-2 pt-8 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      {!isCover && (
                        <Button
                          data-manage
                          isDisabled={coverBusy}
                          onPress={() => handleSetCover(photo)}
                          size="sm"
                          variant="secondary"
                        >
                          <IconStar className="size-3.5" />
                          设为封面
                        </Button>
                      )}
                      {isCover && (
                        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-background">
                          <IconCheck className="mr-1 inline size-3" />
                          当前封面
                        </span>
                      )}
                      <Button
                        aria-label="删除照片"
                        data-manage
                        onPress={() => askDeletePhoto(photo)}
                        size="sm"
                        variant="secondary"
                      >
                        <IconTrash className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
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

      {canManage && (
        <>
          <AlbumFormModal
            busy={editBusy}
            error={editError}
            initial={{ title: album.title, description: album.description }}
            mode="edit"
            onClose={() => {
              if (!editBusy) setEditOpen(false);
            }}
            onSubmit={handleEdit}
            open={editOpen}
          />

          <Modal.Backdrop
            isDismissable={!confirmBusy}
            isOpen={confirm !== null}
            onOpenChange={(isOpen) => {
              if (!isOpen && !confirmBusy) setConfirm(null);
            }}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-[420px]">
                <Modal.CloseTrigger aria-label="关闭确认弹窗" />
                <Modal.Header>
                  <Modal.Icon className="bg-danger-soft text-danger">
                    <IconTrash className="size-5" />
                  </Modal.Icon>
                  <Modal.Heading>{confirm?.title}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-sm leading-6 text-muted">{confirm?.body}</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button isDisabled={confirmBusy} slot="close" variant="secondary">
                    取消
                  </Button>
                  <Button
                    isDisabled={!confirm}
                    isPending={confirmBusy}
                    onPress={handleConfirm}
                    variant="danger"
                  >
                    确认删除
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </>
      )}
    </PageShell>
  );
}
