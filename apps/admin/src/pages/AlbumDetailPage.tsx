import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { PhotoDto } from '@classbook/shared';
import { Button, Card, Chip, Modal, Spinner, toast } from '@heroui/react';
import { albums, getErrorMessage, type AlbumCreateInput, type PhotoUpload } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { AlbumFormModal } from '../components/albums/AlbumFormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { MultiImageUploader } from '../components/ui/ImageUploader';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const albumId = id ?? '';
  const navigate = useNavigate();
  const { data: album, loading, error, reload } = useAsyncData(
    () => (albumId ? albums.get(albumId) : Promise.reject(new Error('相册不存在'))),
    [albumId],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<PhotoDto | null>(null);
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const [coverBusyId, setCoverBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PhotoDto | null>(null);

  if (!albumId) return <Navigate to="/albums" replace />;

  const handleEdit = async (input: AlbumCreateInput) => {
    await albums.update(albumId, {
      title: input.title,
      description: input.description ?? null,
    });
    toast.success('相册信息已更新');
    reload();
  };

  const handleDeleteAlbum = async () => {
    if (!album) return;
    setDeleting(true);
    try {
      await albums.remove(album.id);
      toast.success(`相册「${album.title}」已删除`);
      navigate('/albums', { replace: true });
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoTarget || !album) return;
    setPhotoDeleting(true);
    try {
      await albums.removePhoto(photoTarget.id);
      if (album.coverUrl === photoTarget.url) {
        await albums.update(album.id, { coverUrl: null }).catch(() => undefined);
      }
      toast.success('照片已删除');
      setPhotoTarget(null);
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setPhotoDeleting(false);
    }
  };

  const handleSetCover = async (photo: PhotoDto) => {
    if (!album) return;
    setCoverBusyId(photo.id);
    try {
      await albums.update(album.id, { coverUrl: photo.url });
      toast.success('相册封面已更新');
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setCoverBusyId(null);
    }
  };

  const handleUploaded = async (photos: PhotoUpload[]) => {
    await albums.addPhotos(albumId, { photos });
    reload();
  };

  return (
    <>
      <Link
        to="/albums"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        返回相册列表
      </Link>

      {loading && !album ? (
        <LoadingBlock label="正在读取相册…" />
      ) : error && !album ? (
        <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
      ) : album ? (
        <>
          <PageHeader
            title={album.title}
            description={album.description || '这本相册还没有描述。'}
            actions={
              <>
                <Button variant="secondary" onPress={() => setEditOpen(true)}>
                  <Icon name="edit" className="size-4" />
                  编辑相册
                </Button>
                <Button variant="danger-soft" onPress={() => setDeleteOpen(true)}>
                  <Icon name="trash" className="size-4" />
                  删除相册
                </Button>
              </>
            }
          />

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">添加照片</h2>
                <p className="mt-0.5 text-xs text-muted">
                  上传后会立即加入相册，可继续设置封面或删除。
                </p>
              </div>
              <Chip size="sm" color={album.coverUrl ? 'success' : 'default'} variant="soft">
                {album.coverUrl ? '已设置封面' : '未设置封面'}
              </Chip>
            </div>
            <MultiImageUploader onUploaded={handleUploaded} label="点击选择照片上传" />
          </Card>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                相册照片{' '}
                <span className="text-sm font-normal text-muted">{album.photos.length} 张</span>
              </h2>
              <p className="hidden text-[11px] text-muted sm:block">悬停照片可设为封面或删除</p>
            </div>

            {album.photos.length === 0 ? (
              <EmptyState
                icon="image"
                title="相册还是空的"
                description="使用上方的上传区域，一次添加多张照片。"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {album.photos.map((photo) => {
                  const isCover = album.coverUrl === photo.url;
                  const coverBusy = coverBusyId === photo.id;
                  return (
                    <article
                      key={photo.id}
                      className="group relative overflow-hidden rounded-2xl border border-border bg-surface"
                    >
                      <button
                        type="button"
                        onClick={() => setPreview(photo)}
                        className="block aspect-square w-full overflow-hidden bg-default"
                        aria-label="查看照片大图"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || '相册照片'}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                        {photo.videoUrl ? (
                          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                            实况
                          </span>
                        ) : null}
                      </button>

                      {isCover ? (
                        <div className="pointer-events-none absolute right-2 top-2">
                          <Chip size="sm" color="success" variant="primary" className="shadow-sm">
                            封面
                          </Chip>
                        </div>
                      ) : null}

                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 pt-8 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={isCover || coverBusy}
                          onPress={() => handleSetCover(photo)}
                        >
                          {coverBusy ? (
                            <Spinner color="current" size="sm" />
                          ) : (
                            <Icon name="star" className="size-3" />
                          )}
                          {isCover ? '当前封面' : coverBusy ? '设置中' : '设为封面'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger-soft"
                          aria-label="删除照片"
                          onPress={() => setPhotoTarget(photo)}
                        >
                          <Icon name="trash" className="size-3" />
                          删除
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      <AlbumFormModal
        open={editOpen}
        mode="edit"
        initial={album ? { title: album.title, description: album.description } : undefined}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="删除相册"
        description={
          album ? (
            <>
              确定要删除相册 <span className="font-medium text-foreground">「{album.title}」</span>{' '}
              吗？其中的 {album.photos.length} 张照片记录会一并删除，且不可恢复。
            </>
          ) : null
        }
        confirmLabel="确认删除"
        danger
        loading={deleting}
        onConfirm={handleDeleteAlbum}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
      />

      <ConfirmDialog
        open={photoTarget !== null}
        title="删除照片"
        description={
          photoTarget ? (
            <>
              确定要删除这张照片吗？删除后无法恢复。
              {photoTarget.caption ? (
                <span className="mt-2 block rounded-xl bg-default/60 px-3 py-2 text-xs text-muted">
                  {photoTarget.caption}
                </span>
              ) : null}
            </>
          ) : null
        }
        confirmLabel="确认删除"
        danger
        loading={photoDeleting}
        onConfirm={handleDeletePhoto}
        onClose={() => {
          if (!photoDeleting) setPhotoTarget(null);
        }}
      />

      <Modal.Backdrop
        isOpen={preview !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPreview(null);
        }}
      >
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>照片预览</Modal.Heading>
              <p className="mt-1 text-sm text-muted">
                {preview
                  ? preview.caption || `上传于 ${formatDateTime(preview.createdAt)}`
                  : null}
              </p>
            </Modal.Header>
            <Modal.Body>
              {preview ? (
                <div className="flex justify-center">
                  <img
                    src={preview.url}
                    alt={preview.caption || '相册照片'}
                    className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain"
                  />
                </div>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
